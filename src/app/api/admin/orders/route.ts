import { OrderStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
import { appUrl } from '@/lib/epay/config';
import { closeExpiredOrder } from '@/lib/epay/order-status';
import { markOrderPaid, notifyMerchant, refundOrder } from '@/lib/epay/orders';

export async function POST(request: NextRequest) {
  await requireAdmin();
  const form = await request.formData();
  const tradeNo = String(form.get('tradeNo') || '').trim();
  const action = String(form.get('action') || '').trim();

  if (!tradeNo) return redirect('missing_trade_no');

  const rawOrder = await prisma.order.findUnique({ where: { tradeNo } });
  if (!rawOrder) return redirect('order_not_found');
  const order = await closeExpiredOrder(rawOrder);

  if (action === 'mark_paid') {
    if (order.status === OrderStatus.PENDING) {
      await markOrderPaid({ tradeNo: order.tradeNo });
    }
    return redirect(undefined, 'paid');
  }

  if (action === 'refund') {
    if (order.status !== OrderStatus.PAID) return redirect('refund_status');
    try {
      await refundOrder({ tradeNo: order.tradeNo });
    } catch (error) {
      console.error('refund failed', error);
      return redirect('refund_failed');
    }
    return redirect(undefined, 'refunded');
  }

  if (action === 'notify') {
    await notifyMerchant(order.tradeNo);
    return redirect(undefined, 'notified');
  }

  return redirect('unknown_action');
}

function redirect(error?: string, saved?: string) {
  const url = new URL(appUrl('/admin/orders'));
  if (error) url.searchParams.set('error', error);
  if (saved) url.searchParams.set('saved', saved);
  return NextResponse.redirect(url, { status: 303 });
}