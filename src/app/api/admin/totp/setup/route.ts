import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
import { generateTotpSecret, getTotpQrCode, verifyTotpToken } from '@/lib/totp';

export async function GET() {
  await requireAdmin();
  const secret = generateTotpSecret();
  const rows = await prisma.config.findMany({ where: { key: { in: ['admin_email', 'admin_user'] } } });
  const config = Object.fromEntries(rows.map((row) => [row.key, row.value || '']));
  const qr = await getTotpQrCode(secret, config.admin_email || config.admin_user || 'admin');
  return Response.json({ secret, qr });
}

export async function POST(request: NextRequest) {
  await requireAdmin();
  const body = await request.json().catch(() => ({}));
  const secret = String(body.secret || '').replace(/\s/g, '').toUpperCase();
  const code = String(body.code || '').trim();

  if (!/^[A-Z2-7]{32}$/.test(secret)) {
    return Response.json({ error: 'F2A 原始密钥格式不正确' }, { status: 400 });
  }
  if (!verifyTotpToken(code, secret)) {
    return Response.json({ error: '动态验证码校验失败' }, { status: 400 });
  }

  await prisma.config.upsert({ where: { key: 'totp_secret' }, update: { value: secret }, create: { key: 'totp_secret', value: secret } });
  await prisma.config.upsert({ where: { key: 'totp_enabled' }, update: { value: 'on' }, create: { key: 'totp_enabled', value: 'on' } });

  return Response.json({ ok: true });
}