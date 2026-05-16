import crypto from 'crypto';
import type { Channel, Order } from '@prisma/client';
import type { PaymentCreateResult, PaymentQueryResult } from '@/lib/payments';
import { moneyToString } from '@/lib/epay/utils';

type AlipayConfig = {
  appId?: string;
  privateKey?: string;
  gateway?: string;
};

const DEFAULT_GATEWAY = 'https://openapi.alipay.com/gateway.do';

export async function createAlipayPayment(channel: Channel, order: Order, baseUrl: string): Promise<PaymentCreateResult> {
  const notifyUrl = `${baseUrl.replace(/\/$/, '')}/api/pay/alipay/notify`;
  const returnUrl = order.returnUrl || `${baseUrl.replace(/\/$/, '')}/return/${order.tradeNo}`;
  const product = channel.product || 'qr';
  const config = (channel.config || {}) as AlipayConfig;

  if (!channel.enabled) throw new Error('支付宝通道未启用');
  if (!config.appId || !config.privateKey) throw new Error('支付宝通道缺少 App ID 或应用私钥');

  if (product === 'pc' || product === 'wap') {
    const method = product === 'pc' ? 'alipay.trade.page.pay' : 'alipay.trade.wap.pay';
    const payurl = buildAlipayGatewayUrl(config, {
      method,
      notifyUrl,
      returnUrl,
      bizContent: {
        out_trade_no: order.tradeNo,
        total_amount: moneyToString(order.money),
        subject: order.name,
        product_code: product === 'pc' ? 'FAST_INSTANT_TRADE_PAY' : 'QUICK_WAP_WAY',
      },
    });

    return {
      type: 'jump',
      trade_no: order.tradeNo,
      payurl,
      raw: { provider: 'alipay', product, notifyUrl, returnUrl },
    };
  }

  const qrcode = await createAlipayPrecreateQr(config, {
    notifyUrl,
    outTradeNo: order.tradeNo,
    subject: order.name,
    amount: moneyToString(order.money),
  });

  return {
    type: 'qrcode',
    trade_no: order.tradeNo,
    qrcode,
    raw: { provider: 'alipay', product: 'qr', notifyUrl },
  };
}

function buildAlipayGatewayUrl(
  config: AlipayConfig,
  input: { method: string; notifyUrl: string; returnUrl?: string; bizContent: Record<string, string> },
) {
  const params = buildSignedAlipayParams(config, input);
  const gateway = config.gateway || DEFAULT_GATEWAY;
  return `${gateway}?${new URLSearchParams(params).toString()}`;
}

async function createAlipayPrecreateQr(
  config: AlipayConfig,
  input: { notifyUrl: string; outTradeNo: string; subject: string; amount: string },
) {
  const params = buildSignedAlipayParams(config, {
    method: 'alipay.trade.precreate',
    notifyUrl: input.notifyUrl,
    bizContent: {
      out_trade_no: input.outTradeNo,
      total_amount: input.amount,
      subject: input.subject,
    },
  });

  const response = await fetch(config.gateway || DEFAULT_GATEWAY, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(params),
  });
  const payload = await response.json() as { alipay_trade_precreate_response?: { code?: string; msg?: string; sub_msg?: string; qr_code?: string } };
  const result = payload.alipay_trade_precreate_response;
  if (!response.ok || result?.code !== '10000' || !result.qr_code) {
    throw new Error(result?.sub_msg || result?.msg || '支付宝预下单失败，未返回二维码链接');
  }
  return result.qr_code;
}

export async function queryAlipayPayment(channel: Channel, order: Order): Promise<PaymentQueryResult> {
  const config = (channel.config || {}) as AlipayConfig;
  if (!config.appId || !config.privateKey) throw new Error('支付宝通道缺少 App ID 或应用私钥');

  const params = buildSignedAlipayParams(config, {
    method: 'alipay.trade.query',
    bizContent: { out_trade_no: order.tradeNo },
  });

  const response = await fetch(config.gateway || DEFAULT_GATEWAY, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(params),
  });
  const payload = await response.json() as { alipay_trade_query_response?: { code?: string; msg?: string; sub_msg?: string; trade_status?: string; trade_no?: string; buyer_user_id?: string; total_amount?: string } & Record<string, unknown> };
  const result = payload.alipay_trade_query_response;
  if (!response.ok || !result || (result.code !== '10000' && result.code !== '40004')) {
    throw new Error(result?.sub_msg || result?.msg || '支付宝查单失败');
  }

  return {
    paid: result.trade_status === 'TRADE_SUCCESS' || result.trade_status === 'TRADE_FINISHED',
    tradeState: result.trade_status,
    apiTradeNo: result.trade_no,
    buyer: result.buyer_user_id,
    amount: result.total_amount,
    raw: result,
  };
}

export async function refundAlipayPayment(channel: Channel, order: Order) {
  const config = (channel.config || {}) as AlipayConfig;
  if (!config.appId || !config.privateKey) throw new Error('支付宝通道缺少 App ID 或应用私钥');

  const refundNo = `RF${order.tradeNo}`;
  const params = buildSignedAlipayParams(config, {
    method: 'alipay.trade.refund',
    bizContent: {
      out_trade_no: order.tradeNo,
      refund_amount: moneyToString(order.money),
      out_request_no: refundNo,
    },
  });

  const response = await fetch(config.gateway || DEFAULT_GATEWAY, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(params),
  });
  const payload = await response.json() as { alipay_trade_refund_response?: { code?: string; msg?: string; sub_msg?: string } & Record<string, unknown> };
  const result = payload.alipay_trade_refund_response;
  if (!response.ok || result?.code !== '10000') {
    throw new Error(result?.sub_msg || result?.msg || '支付宝退款失败');
  }
  return { refundNo, raw: result };
}

function buildSignedAlipayParams(
  config: AlipayConfig,
  input: { method: string; notifyUrl?: string; returnUrl?: string; bizContent: Record<string, string> },
) {
  const params: Record<string, string> = {
    app_id: config.appId || '',
    method: input.method,
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: formatAlipayTime(new Date()),
    version: '1.0',
    biz_content: JSON.stringify(input.bizContent),
  };
  if (input.notifyUrl) params.notify_url = input.notifyUrl;
  if (input.returnUrl) params.return_url = input.returnUrl;
  params.sign = signAlipayParams(params, config.privateKey || '');
  return params;
}

function signAlipayParams(params: Record<string, string>, privateKey: string) {
  const content = Object.keys(params)
    .filter((key) => key !== 'sign' && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createSign('RSA-SHA256').update(content, 'utf8').sign(normalizePrivateKey(privateKey), 'base64');
}

function normalizePrivateKey(key: string) {
  if (key.includes('BEGIN')) return key;
  return `-----BEGIN PRIVATE KEY-----\n${key.match(/.{1,64}/g)?.join('\n') || key}\n-----END PRIVATE KEY-----`;
}

function formatAlipayTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export async function verifyAlipayNotify(params: Record<string, string>) {
  return {
    tradeNo: params.out_trade_no || params.trade_no,
    apiTradeNo: params.trade_no,
    buyer: params.buyer_id,
    amount: params.total_amount,
    success: params.trade_status === 'TRADE_SUCCESS' || params.trade_status === 'TRADE_FINISHED',
  };
}