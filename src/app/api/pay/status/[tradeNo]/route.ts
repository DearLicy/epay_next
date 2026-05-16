import { OrderStatus } from '@prisma/client';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { closeExpiredOrder, getOrderExpiresAt, getOrderStatusText } from '@/lib/epay/order-status';
import { buildReturnUrl, markOrderPaid } from '@/lib/epay/orders';
import { moneyToString } from '@/lib/epay/utils';
import { queryPayment } from '@/lib/payments';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ tradeNo: string }> }) {
  const { tradeNo } = await params;
  const found = await prisma.order.findUnique({ where: { tradeNo }, include: { merchant: true } });

  if (!found) {
    return Response.json({ code: -1, msg: '订单不存在' }, { status: 404 });
  }

  let order = await closeExpiredOrder(found);
  let providerState: string | undefined;
  if (order.status === OrderStatus.PENDING) {
    const synced = await syncProviderStatus(order.tradeNo);
    if (synced.paidOrder) order = synced.paidOrder;
    providerState = synced.providerState;
  }

  const expiresAt = await getOrderExpiresAt(order.createdAt);
  const returnUrl = order.status === 'PAID' ? buildReturnUrl(order) : null;

  return Response.json({
    code: 1,
    msg: 'ok',
    trade_no: order.tradeNo,
    out_trade_no: order.outTradeNo,
    name: order.name,
    money: moneyToString(order.money),
    type: order.typeCode || '',
    status: order.status,
    status_text: getOrderStatusText(order.status),
    provider_state: providerState,
    paid_at: order.paidAt,
    expires_at: expiresAt,
    return_url: returnUrl,
  });
}

async function syncProviderStatus(tradeNo: string) {
  const order = await prisma.order.findUnique({ where: { tradeNo }, include: { channel: true } });
  if (!order?.channel || order.status !== OrderStatus.PENDING) return { paidOrder: null, providerState: undefined };

  try {
    const result = await queryPayment(order.channel, order);
    if (!result.paid) return { paidOrder: null, providerState: result.tradeState };
    const paid = await markOrderPaid({
      tradeNo: order.tradeNo,
      apiTradeNo: result.apiTradeNo,
      buyer: result.buyer,
      amount: result.amount,
    });
    return { paidOrder: paid, providerState: result.tradeState };
  } catch (error) {
    console.warn('provider payment status query failed', error);
    return { paidOrder: null, providerState: undefined };
  }
}
