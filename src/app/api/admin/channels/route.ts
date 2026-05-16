import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
import { appUrl } from '@/lib/epay/config';

const ALIPAY_PRODUCTION_GATEWAY = 'https://openapi.alipay.com/gateway.do';

export async function POST(request: NextRequest) {
  await requireAdmin();
  const form = await request.formData();
  const id = Number(form.get('id'));
  if (!id) return NextResponse.redirect(appUrl('/admin/channels?error=1'), { status: 303 });

  const channel = await prisma.channel.findUnique({ where: { id } });
  if (!channel) return NextResponse.redirect(appUrl('/admin/channels?error=1'), { status: 303 });

  const enabled = form.get('enabled') === 'on';
  const product = String(form.get('product') || channel.product).trim();
  const name = String(form.get('name') || channel.name).trim();

  const config = buildChannelConfig(channel.provider, form);

  await prisma.channel.update({
    where: { id },
    data: { enabled, name, product, config },
  });

  return NextResponse.redirect(appUrl('/admin/channels?success=1'), { status: 303 });
}

function text(form: FormData, key: string) {
  return String(form.get(key) || '').trim();
}

function buildChannelConfig(provider: string, form: FormData): Prisma.InputJsonValue {
  if (provider === 'ALIPAY') {
    return {
      appId: text(form, 'appId'),
      privateKey: text(form, 'privateKey'),
      alipayPublicKey: text(form, 'alipayPublicKey'),
      gateway: ALIPAY_PRODUCTION_GATEWAY,
    };
  }

  return {
    appId: text(form, 'appId'),
    mchId: text(form, 'mchId'),
    apiV3Key: text(form, 'apiV3Key'),
    merchantPrivateKey: text(form, 'merchantPrivateKey'),
    merchantSerialNo: text(form, 'merchantSerialNo'),
    platformCertificate: text(form, 'platformCertificate'),
  };
}