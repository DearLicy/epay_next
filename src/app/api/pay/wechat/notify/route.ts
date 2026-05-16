import { NextRequest } from 'next/server';
import { markOrderPaid } from '@/lib/epay/orders';
import { verifyWechatNotify } from '@/lib/payments/wechat';

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const result = await verifyWechatNotify(payload);
  if (!result.success || !result.tradeNo) return Response.json({ code: 'FAIL', message: 'fail' });
  await markOrderPaid({ tradeNo: result.tradeNo, apiTradeNo: result.apiTradeNo, buyer: result.buyer, amount: result.amount });
  return Response.json({ code: 'SUCCESS', message: '成功' });
}