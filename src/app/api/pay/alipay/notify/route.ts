import { NextRequest } from 'next/server';
import { markOrderPaid } from '@/lib/epay/orders';
import { readRequestParams } from '@/lib/epay/http';
import { verifyAlipayNotify } from '@/lib/payments/alipay';

export async function POST(request: NextRequest) {
  const params = await readRequestParams(request);
  const result = await verifyAlipayNotify(params);
  if (!result.success || !result.tradeNo) return new Response('fail');
  await markOrderPaid({ tradeNo: result.tradeNo, apiTradeNo: result.apiTradeNo, buyer: result.buyer, amount: result.amount });
  return new Response('success');
}

export async function GET(request: NextRequest) {
  return POST(request);
}