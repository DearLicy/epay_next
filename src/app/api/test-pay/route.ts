import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { appUrl } from '@/lib/epay/config';
import { makeSign } from '@/lib/epay/sign';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const name = String(form.get('name') || '测试商品').trim() || '测试商品';
  const money = Number(form.get('money') || '0.01').toFixed(2);
  const type = String(form.get('type') || '').trim();
  const merchant = await prisma.merchant.findUnique({ where: { id: 1000 } });
  if (!merchant) return NextResponse.redirect(appUrl('/test-pay?error=merchant'), { status: 303 });

  const base = appUrl();
  const params: Record<string, string> = {
    pid: String(merchant.id),
    out_trade_no: `TEST${Date.now()}`,
    notify_url: `${base}/api/test-pay/notify`,
    return_url: `${base}/test-pay`,
    name,
    money,
    sign_type: 'MD5',
  };
  if (type && type !== 'cashier') params.type = type;
  params.sign = makeSign(params, merchant.apiKey);

  const url = new URL(appUrl('/submit.php'));
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url, { status: 303 });
}