import { NextRequest, NextResponse } from 'next/server';
import { createOrReuseOrder, preparePayment } from '@/lib/epay/orders';
import { appUrl } from '@/lib/epay/config';
import { htmlError, readRequestParams } from '@/lib/epay/http';

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  try {
    const params = await readRequestParams(request);
    const order = await createOrReuseOrder(params as never, 'page');
    const payment = await preparePayment(order.tradeNo, params.type, appUrl());

    if ('url' in payment) return NextResponse.redirect(payment.url);
    if (payment.payurl) return NextResponse.redirect(payment.payurl);
    if (payment.qrcode || payment.urlscheme) return NextResponse.redirect(appUrl(`/pay/${order.tradeNo}`));
    if (payment.html) return new Response(payment.html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    return NextResponse.redirect(appUrl(`/cashier/${order.tradeNo}`));
  } catch (error) {
    return htmlError(error instanceof Error ? error.message : String(error));
  }
}