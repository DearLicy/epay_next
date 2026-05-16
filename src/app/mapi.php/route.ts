import { NextRequest } from 'next/server';
import { createOrReuseOrder, preparePayment } from '@/lib/epay/orders';
import { appUrl } from '@/lib/epay/config';
import { getClientIp, jsonError, readRequestParams } from '@/lib/epay/http';

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  try {
    const params = await readRequestParams(request);
    params.clientip ||= getClientIp(request);
    const order = await createOrReuseOrder(params as never, 'api');
    const payment = await preparePayment(order.tradeNo, params.type, appUrl());
    return Response.json({ code: 1, trade_no: order.tradeNo, ...payment });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error));
  }
}