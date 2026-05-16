import { OrderStatus } from '@prisma/client';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { jsonError, readRequestParams } from '@/lib/epay/http';
import { closeExpiredOrder, closeExpiredOrders, getOrderExpiresAt, getOrderStatusText } from '@/lib/epay/order-status';
import { moneyToString } from '@/lib/epay/utils';
import { notifyMerchant, refundOrder as processRefundOrder } from '@/lib/epay/orders';

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const params = await readRequestParams(request);
  const pid = Number(params.pid);
  const key = params.key;
  const merchant = await prisma.merchant.findUnique({ where: { id: pid || 0 } });
  if (!merchant || merchant.apiKey !== key) return jsonError('商户ID或密钥错误', -2);

  switch (params.act) {
    case 'query':
      return Response.json({ code: 1, msg: '查询商户信息成功', pid: merchant.id, key: merchant.apiKey, money: moneyToString(merchant.money), status: merchant.status ? 1 : 0 });
    case 'order':
      return queryOrder(params, merchant.id);
    case 'orders':
      return queryOrders(params, merchant.id);
    case 'refund':
      return refundOrder(params, merchant.id);
    case 'notify':
      if (!params.trade_no) return jsonError('订单号不能为空');
      await notifyMerchant(params.trade_no);
      return Response.json({ code: 1, msg: '通知任务已执行' });
    default:
      return jsonError('No Act');
  }
}

async function queryOrder(params: Record<string, string>, merchantId: number) {
  const found = await prisma.order.findFirst({
    where: params.trade_no ? { merchantId, tradeNo: params.trade_no } : { merchantId, outTradeNo: params.out_trade_no || '' },
  });
  if (!found) return jsonError('订单不存在', -1);
  const order = await closeExpiredOrder(found);
  const expiresAt = await getOrderExpiresAt(order.createdAt);
  return Response.json({
    code: 1,
    msg: '查询订单号成功',
    trade_no: order.tradeNo,
    out_trade_no: order.outTradeNo,
    api_trade_no: order.apiTradeNo || '',
    type: order.typeCode || '',
    pid: order.merchantId,
    addtime: order.createdAt,
    endtime: order.paidAt,
    expiretime: expiresAt,
    name: order.name,
    money: moneyToString(order.money),
    status: order.status === OrderStatus.PAID ? 1 : order.status === OrderStatus.REFUNDED ? 2 : 0,
    status_text: getOrderStatusText(order.status),
    param: order.param || '',
    buyer: order.buyer || '',
    payurl: order.payUrl || order.qrCode || order.urlScheme || '',
  });
}

async function queryOrders(params: Record<string, string>, merchantId: number) {
  await closeExpiredOrders();
  const limit = Math.min(Number(params.limit || 20), 50);
  const offset = Number(params.offset || 0);
  const status = params.status === undefined ? undefined : Number(params.status);
  const where = { merchantId, ...(Number.isFinite(status) ? { status: status === 1 ? OrderStatus.PAID : OrderStatus.PENDING } : {}) };
  const [count, data] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, take: limit, skip: offset, orderBy: { createdAt: 'desc' } }),
  ]);
  return Response.json({
    code: 1,
    msg: '查询订单列表成功',
    count,
    data: await Promise.all(
      data.map(async (order) => ({
        trade_no: order.tradeNo,
        out_trade_no: order.outTradeNo,
        type: order.typeCode || '',
        name: order.name,
        money: moneyToString(order.money),
        status: order.status === OrderStatus.PAID ? 1 : order.status === OrderStatus.REFUNDED ? 2 : 0,
        status_text: getOrderStatusText(order.status),
        addtime: order.createdAt,
        endtime: order.paidAt,
        expiretime: await getOrderExpiresAt(order.createdAt),
      })),
    ),
  });
}

async function refundOrder(params: Record<string, string>, merchantId: number) {
  const order = await prisma.order.findFirst({ where: params.trade_no ? { merchantId, tradeNo: params.trade_no } : { merchantId, outTradeNo: params.out_trade_no || '' } });
  if (!order) return jsonError('订单不存在');
  if (order.status !== OrderStatus.PAID) return jsonError('当前订单状态不支持退款');
  try {
    await processRefundOrder({ tradeNo: order.tradeNo });
  } catch (error) {
    const message = error instanceof Error ? error.message : '退款失败';
    return jsonError(message);
  }
  return Response.json({ code: 0, msg: '退款成功' });
}