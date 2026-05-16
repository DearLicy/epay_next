import crypto from 'crypto';
import type { Channel, Order } from '@prisma/client';
import type { PaymentCreateResult, PaymentQueryResult } from '@/lib/payments';
import { moneyToString } from '@/lib/epay/utils';

type WechatConfig = {
  appId?: string;
  mchId?: string;
  merchantPrivateKey?: string;
  merchantSerialNo?: string;
};

export async function createWechatPayment(channel: Channel, order: Order, baseUrl: string): Promise<PaymentCreateResult> {
  const notifyUrl = `${baseUrl.replace(/\/$/, '')}/api/pay/wechat/notify`;
  const product = channel.product || 'native';
  const config = (channel.config || {}) as WechatConfig;

  if (!channel.enabled) throw new Error('微信支付通道未启用');
  if (!config.appId || !config.mchId || !config.merchantPrivateKey || !config.merchantSerialNo) {
    throw new Error('微信支付通道缺少 App ID、商户号、商户私钥或证书序列号');
  }

  if (product === 'h5') {
    const result = await requestWechatPayment<{ h5_url?: string }>(config, '/v3/pay/transactions/h5', {
      appid: config.appId,
      mchid: config.mchId,
      description: order.name,
      out_trade_no: order.tradeNo,
      notify_url: notifyUrl,
      amount: { total: yuanToFen(moneyToString(order.money)), currency: 'CNY' },
      scene_info: {
        payer_client_ip: order.ip || '127.0.0.1',
        h5_info: { type: 'Wap' },
      },
    });

    if (!result.h5_url) throw new Error('微信 H5 下单失败，未返回 h5_url');
    return {
      type: 'jump',
      trade_no: order.tradeNo,
      payurl: result.h5_url,
      raw: { provider: 'wechat', product, notifyUrl },
    };
  }

  if (product === 'jsapi' || product === 'miniprogram' || product === 'app') {
    throw new Error(`微信 ${product} 支付需要 openid 或客户端参数，不能生成通用扫码二维码`);
  }

  const result = await requestWechatPayment<{ code_url?: string }>(config, '/v3/pay/transactions/native', {
    appid: config.appId,
    mchid: config.mchId,
    description: order.name,
    out_trade_no: order.tradeNo,
    notify_url: notifyUrl,
    amount: { total: yuanToFen(moneyToString(order.money)), currency: 'CNY' },
  });

  if (!result.code_url) throw new Error('微信 Native 下单失败，未返回 code_url');
  return {
    type: 'qrcode',
    trade_no: order.tradeNo,
    qrcode: result.code_url,
    raw: { provider: 'wechat', product: 'native', notifyUrl },
  };
}

export async function queryWechatPayment(channel: Channel, order: Order): Promise<PaymentQueryResult> {
  const config = (channel.config || {}) as WechatConfig;
  if (!config.appId || !config.mchId || !config.merchantPrivateKey || !config.merchantSerialNo) {
    throw new Error('微信支付通道缺少 App ID、商户号、商户私钥或证书序列号');
  }

  const result = await requestWechatPayment<Record<string, unknown>>(config, `/v3/pay/transactions/out-trade-no/${order.tradeNo}?mchid=${config.mchId}`, undefined, 'GET');
  const amount = result.amount && typeof result.amount === 'object' && 'total' in result.amount ? (Number(result.amount.total) / 100).toFixed(2) : undefined;

  return {
    paid: result.trade_state === 'SUCCESS',
    tradeState: result.trade_state ? String(result.trade_state) : undefined,
    apiTradeNo: result.transaction_id ? String(result.transaction_id) : undefined,
    buyer: result.payer ? JSON.stringify(result.payer) : undefined,
    amount,
    raw: result,
  };
}

export async function refundWechatPayment(channel: Channel, order: Order) {
  const config = (channel.config || {}) as WechatConfig;
  if (!config.appId || !config.mchId || !config.merchantPrivateKey || !config.merchantSerialNo) {
    throw new Error('微信支付通道缺少 App ID、商户号、商户私钥或证书序列号');
  }

  const refundNo = `RF${order.tradeNo}`;
  const result = await requestWechatPayment<Record<string, unknown>>(config, '/v3/refund/domestic/refunds', {
    out_trade_no: order.tradeNo,
    out_refund_no: refundNo,
    reason: '管理员发起退款',
    amount: {
      refund: yuanToFen(moneyToString(order.money)),
      total: yuanToFen(moneyToString(order.money)),
      currency: 'CNY',
    },
  });

  return { refundNo, raw: result };
}

async function requestWechatPayment<T>(config: WechatConfig, path: string, payload?: Record<string, unknown>, method: 'GET' | 'POST' = 'POST') {
  const body = payload ? JSON.stringify(payload) : '';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = crypto.createSign('RSA-SHA256').update(message).sign(normalizePrivateKey(config.merchantPrivateKey || ''), 'base64');
  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.merchantSerialNo}"`;

  const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
    method,
    headers: {
      authorization: authorization,
      accept: 'application/json',
      ...(payload ? { 'content-type': 'application/json' } : {}),
    },
    ...(payload ? { body } : {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) as T & { message?: string } : {} as T & { message?: string };
  if (!response.ok) throw new Error(data.message || `微信支付下单失败：HTTP ${response.status}`);
  return data;
}

function yuanToFen(value: string) {
  return Math.round(Number(value) * 100);
}

function normalizePrivateKey(key: string) {
  if (key.includes('BEGIN')) return key;
  return `-----BEGIN PRIVATE KEY-----\n${key.match(/.{1,64}/g)?.join('\n') || key}\n-----END PRIVATE KEY-----`;
}

export async function verifyWechatNotify(payload: Record<string, unknown>) {
  return {
    tradeNo: String(payload.out_trade_no || ''),
    apiTradeNo: payload.transaction_id ? String(payload.transaction_id) : undefined,
    buyer: payload.payer ? JSON.stringify(payload.payer) : undefined,
    amount: payload.amount && typeof payload.amount === 'object' && 'total' in payload.amount ? (Number(payload.amount.total) / 100).toFixed(2) : undefined,
    success: payload.trade_state === 'SUCCESS' || payload.event_type === 'TRANSACTION.SUCCESS',
  };
}