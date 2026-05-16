import type { Channel, Order } from '@prisma/client';
import { createAlipayPayment, queryAlipayPayment, refundAlipayPayment } from '@/lib/payments/alipay';
import { createWechatPayment, queryWechatPayment, refundWechatPayment } from '@/lib/payments/wechat';

export type PaymentCreateResult = {
  type?: 'jump' | 'qrcode' | 'html' | 'urlscheme';
  trade_no: string;
  payurl?: string;
  qrcode?: string;
  urlscheme?: string;
  html?: string;
  raw?: Record<string, unknown>;
};

export type PaymentRefundResult = {
  refundNo: string;
  raw?: Record<string, unknown>;
};

export type PaymentQueryResult = {
  paid: boolean;
  tradeState?: string;
  apiTradeNo?: string;
  buyer?: string;
  amount?: string;
  raw?: Record<string, unknown>;
};

export async function createPayment(channel: Channel, order: Order, baseUrl: string): Promise<PaymentCreateResult> {
  if (channel.provider === 'ALIPAY') return createAlipayPayment(channel, order, baseUrl);
  if (channel.provider === 'WECHAT') return createWechatPayment(channel, order, baseUrl);
  throw new Error('不支持的支付通道');
}

export async function queryPayment(channel: Channel, order: Order): Promise<PaymentQueryResult> {
  if (channel.provider === 'ALIPAY') return queryAlipayPayment(channel, order);
  if (channel.provider === 'WECHAT') return queryWechatPayment(channel, order);
  throw new Error('不支持的支付通道');
}

export async function refundPayment(channel: Channel, order: Order): Promise<PaymentRefundResult> {
  if (channel.provider === 'ALIPAY') return refundAlipayPayment(channel, order);
  if (channel.provider === 'WECHAT') return refundWechatPayment(channel, order);
  throw new Error('不支持的退款通道');
}