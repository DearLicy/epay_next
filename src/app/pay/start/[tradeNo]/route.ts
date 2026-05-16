import { NextRequest, NextResponse } from 'next/server';
import { preparePayment } from '@/lib/epay/orders';
import { appUrl } from '@/lib/epay/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ tradeNo: string }> }) {
  const { tradeNo } = await params;
  const type = request.nextUrl.searchParams.get('type') || undefined;

  try {
    const payment = await preparePayment(tradeNo, type, appUrl());
    if ('url' in payment) return NextResponse.redirect(payment.url, { status: 303 });
    if (payment.payurl) return NextResponse.redirect(payment.payurl, { status: 303 });
    return NextResponse.redirect(appUrl(`/pay/${tradeNo}`), { status: 303 });
  } catch (error) {
    const url = new URL(appUrl(`/cashier/${tradeNo}`));
    url.searchParams.set('error', error instanceof Error ? error.message : String(error));
    return NextResponse.redirect(url, { status: 303 });
  }
}