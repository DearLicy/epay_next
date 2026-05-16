import { NotifyStatus, Prisma, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { verifySign, withSign } from '@/lib/epay/sign';
import { generateTradeNo, getDomain, moneyToString, validateMoney } from '@/lib/epay/utils';
import { appUrl, getConfigMap } from '@/lib/epay/config';
import { getOrderStatusText, isOrderExpired } from '@/lib/epay/order-status';
import { createPayment, refundPayment } from '@/lib/payments';
import { sendOrderPaidMail } from '@/lib/mail';

export type SubmitMode = 'page' | 'api';

export type CreateOrderInput = {
  pid: string;
  type?: string;
  out_trade_no: string;
  notify_url: string;
  return_url?: string;
  name: string;
  money: string;
  clientip?: string;
  device?: string;
  param?: string;
  sign?: string;
  sign_type?: string;
};

export async function validateMerchantSigned(params: Record<string, string>) {
  const pid = Number(params.pid);
  if (!pid) throw new Error('商户ID不能为空');
  const merchant = await prisma.merchant.findUnique({ where: { id: pid } });
  if (!merchant) throw new Error('商户不存在！');
  if (!merchant.status) throw new Error('商户已封禁，无法支付！');
  if (!verifySign(params, merchant.apiKey)) throw new Error('签名校验失败，请返回重试！');
  return merchant;
}

export async function createOrReuseOrder(params: CreateOrderInput, mode: SubmitMode) {
  const merchant = await validateMerchantSigned(params as Record<string, string>);
  validateCreateParams(params, mode);

  const configs = await getConfigMap();
  const min = Number(configs.pay_minmoney || 0);
  const max = Number(configs.pay_maxmoney || 0);
  const amount = Number(params.money);
  if (min > 0 && amount < min) throw new Error(`最小支付金额是${min}元`);
  if (max > 0 && amount > max) throw new Error(`最大支付金额是${max}元`);

  const existing = await prisma.order.findUnique({
    where: { merchantId_outTradeNo: { merchantId: merchant.id, outTradeNo: params.out_trade_no } },
  });

  if (existing) {
    if (await isOrderExpired(existing)) {
      await prisma.order.update({ where: { tradeNo: existing.tradeNo }, data: { status: OrderStatus.CLOSED } });
      throw new Error(`该订单(${params.out_trade_no})已超时关闭，请更换订单号重新发起支付`);
    }
    if (existing.status !== OrderStatus.PENDING) throw new Error(`该订单(${params.out_trade_no})状态为${getOrderStatusText(existing.status)}，不可重复发起支付`);
    if (
      moneyToString(existing.money) !== Number(params.money).toFixed(2) ||
      existing.name !== params.name ||
      existing.notifyUrl !== params.notify_url ||
      (existing.returnUrl || '') !== (params.return_url || '') ||
      (existing.param || '') !== (params.param || '')
    ) {
      throw new Error(`该订单(${params.out_trade_no})支付参数有变化，请更换订单号重新发起支付`);
    }
    return existing;
  }

  return prisma.order.create({
    data: {
      tradeNo: generateTradeNo(),
      outTradeNo: params.out_trade_no,
      merchantId: merchant.id,
      name: params.name.slice(0, 127),
      money: params.money,
      realMoney: params.money,
      getMoney: params.money,
      notifyUrl: params.notify_url,
      returnUrl: params.return_url || null,
      param: params.param || null,
      domain: getDomain(params.notify_url),
      ip: params.clientip || null,
      device: params.device || 'pc',
    },
  });
}

export async function preparePayment(orderTradeNo: string, type?: string, requestUrl?: string) {
  const order = await prisma.order.findUnique({ where: { tradeNo: orderTradeNo }, include: { merchant: true } });
  if (!order) throw new Error('订单不存在');
  if (await isOrderExpired(order)) {
    await prisma.order.update({ where: { tradeNo: order.tradeNo }, data: { status: OrderStatus.CLOSED } });
    throw new Error('订单已超时关闭，无法继续支付');
  }
  if (order.status !== OrderStatus.PENDING) throw new Error(`订单状态为${getOrderStatusText(order.status)}，不可继续支付`);
  if (!type) return { type: 'jump' as const, url: `${appUrl()}/cashier/${order.tradeNo}` };

  const payType = await prisma.payType.findFirst({ where: { code: type } });
  if (!payType) throw new Error('支付方式不存在');
  const channel = await prisma.channel.findFirst({ where: { typeId: payType.id, enabled: true }, orderBy: { id: 'asc' } });
  if (!channel) throw new Error('当前支付方式没有可用通道');

  const payment = await createPayment(channel, order, requestUrl || appUrl());
  await prisma.order.update({
    where: { tradeNo: order.tradeNo },
    data: {
      typeId: payType.id,
      typeCode: payType.code,
      channelId: channel.id,
      channelCode: channel.code,
      payUrl: payment.payurl ?? null,
      qrCode: payment.qrcode ?? null,
      urlScheme: payment.urlscheme ?? null,
      providerResult: payment.raw ? (payment.raw as Prisma.InputJsonValue) : undefined,
    },
  });
  return payment;
}

export async function markOrderPaid(input: { tradeNo: string; apiTradeNo?: string; buyer?: string; amount?: string }) {
  const order = await prisma.order.findUnique({ where: { tradeNo: input.tradeNo }, include: { merchant: true } });
  if (!order) throw new Error('订单不存在');
  if (input.amount && moneyToString(order.money) !== Number(input.amount).toFixed(2)) throw new Error('订单金额不匹配');
  if (order.status !== OrderStatus.PENDING) return order;
  const paid = await prisma.order.update({
    where: { tradeNo: order.tradeNo },
    data: { status: OrderStatus.PAID, apiTradeNo: input.apiTradeNo, buyer: input.buyer, paidAt: new Date() },
    include: { merchant: true },
  });
  await notifyMerchant(paid.tradeNo);
  await sendOrderPaidMail({ tradeNo: paid.tradeNo, outTradeNo: paid.outTradeNo, name: paid.name, money: moneyToString(paid.money), typeCode: paid.typeCode });
  return paid;
}

export async function refundOrder(input: { tradeNo: string }) {
  const order = await prisma.order.findUnique({ where: { tradeNo: input.tradeNo }, include: { channel: true } });
  if (!order) throw new Error('订单不存在');
  if (order.status !== OrderStatus.PAID) throw new Error('当前订单状态不支持退款');
  if (!order.channel) throw new Error('订单缺少支付通道，无法发起官方退款');

  const refund = await refundPayment(order.channel, order);
  const previousResult = order.providerResult && typeof order.providerResult === 'object' && !Array.isArray(order.providerResult) ? order.providerResult : {};
  const refunded = await prisma.order.update({
    where: { tradeNo: order.tradeNo },
    data: {
      status: OrderStatus.REFUNDED,
      providerResult: {
        ...previousResult,
        refund: refund.raw ? (refund.raw as Prisma.InputJsonValue) : { refundNo: refund.refundNo },
      },
    },
  });

  return { order: refunded, refund };
}

export async function notifyMerchant(tradeNo: string) {
  const order = await prisma.order.findUnique({ where: { tradeNo }, include: { merchant: true } });
  if (!order) return;
  const params = withSign(
    {
      pid: order.merchantId,
      trade_no: order.tradeNo,
      out_trade_no: order.outTradeNo,
      type: order.typeCode || '',
      name: order.name,
      money: moneyToString(order.money),
      trade_status: 'TRADE_SUCCESS',
      param: order.param || '',
    },
    order.merchant.apiKey,
  );

  let status: NotifyStatus = NotifyStatus.FAILED;
  let responseCode: number | undefined;
  let responseBody = '';
  let error: string | undefined;
  try {
    const url = new URL(order.notifyUrl);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { method: 'GET' });
    responseCode = response.status;
    responseBody = await response.text();
    status = responseBody.trim().toLowerCase().includes('success') ? NotifyStatus.SUCCESS : NotifyStatus.FAILED;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  await prisma.notifyLog.create({ data: { tradeNo, url: order.notifyUrl, params, responseCode, responseBody, status, error } });
  await prisma.order.update({ where: { tradeNo }, data: { notifyStatus: status, notifyCount: { increment: 1 }, notifyLastAt: new Date() } });
}

export function buildReturnUrl(order: Awaited<ReturnType<typeof prisma.order.findUnique>> & { merchant?: { apiKey: string } }) {
  if (!order?.returnUrl || !order.merchant) return null;
  const params = withSign(
    {
      pid: order.merchantId,
      trade_no: order.tradeNo,
      out_trade_no: order.outTradeNo,
      type: order.typeCode || '',
      name: order.name,
      money: moneyToString(order.money),
      trade_status: order.status === OrderStatus.PAID ? 'TRADE_SUCCESS' : 'TRADE_PENDING',
      param: order.param || '',
    },
    order.merchant.apiKey,
  );
  const url = new URL(order.returnUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function validateCreateParams(params: CreateOrderInput, mode: SubmitMode) {
  if (!params.out_trade_no) throw new Error('订单号(out_trade_no)不能为空');
  if (!/^[a-zA-Z0-9._\-|]+$/.test(params.out_trade_no)) throw new Error('订单号(out_trade_no)格式不正确');
  if (!params.notify_url) throw new Error('通知地址(notify_url)不能为空');
  if (mode === 'page' && !params.return_url) throw new Error('回调地址(return_url)不能为空');
  if (!params.name) throw new Error('商品名称(name)不能为空');
  if (!params.money) throw new Error('金额(money)不能为空');
  const moneyError = validateMoney(params.money);
  if (moneyError) throw new Error(moneyError);
  if (mode === 'api' && !params.type) throw new Error('支付方式(type)不能为空');
  if (mode === 'api' && !params.clientip) throw new Error('用户IP地址(clientip)不能为空');
}