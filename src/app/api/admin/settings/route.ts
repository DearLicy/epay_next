import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
import { appUrl } from '@/lib/epay/config';

const baseConfigKeys = ['sitename', 'pay_minmoney', 'pay_maxmoney', 'admin_login_bg'];
const authConfigKeys = [
  'admin_email',
  'smtp_host',
  'smtp_port',
  'smtp_user',
  'smtp_pass',
  'smtp_from',
  'order_paid_email_to',
];
const switchKeys = [
  'smtp_enabled',
  'mail_login_enabled',
  'mail_login_only',
  'totp_enabled',
  'totp_login_only',
  'login_captcha_enabled',
];

export async function POST(request: NextRequest) {
  await requireAdmin();
  const form = await request.formData();
  const action = String(form.get('action') || 'save');
  const merchantName = String(form.get('merchant_name') || '').trim();
  const adminUser = String(form.get('admin_user') || 'admin').trim() || 'admin';
  const adminPassword = String(form.get('admin_password') || '');
  const redirectTo = String(form.get('redirect_to') || '/admin/settings');

  const merchantKey = action === 'reset_key' ? generateMerchantKey() : String(form.get('merchant_key') || '').trim();

  if (action === 'update_merchant' || action === 'reset_key') {
    await prisma.merchant.update({
      where: { id: 1000 },
      data: { ...(merchantName ? { name: merchantName } : {}), ...(merchantKey ? { apiKey: merchantKey } : {}) },
    });
  }

  if (action === 'save') {
    for (const key of [...baseConfigKeys, ...authConfigKeys]) {
      const value = String(form.get(key) || '');
      await prisma.config.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    for (const key of switchKeys) {
      const value = form.get(key) === 'on' ? 'on' : '';
      await prisma.config.upsert({ where: { key }, update: { value }, create: { key, value } });
    }

    const canonicalUrl = appUrl('/');
    await prisma.config.upsert({ where: { key: 'apiurl' }, update: { value: canonicalUrl }, create: { key: 'apiurl', value: canonicalUrl } });
    await prisma.config.upsert({ where: { key: 'localurl' }, update: { value: canonicalUrl }, create: { key: 'localurl', value: canonicalUrl } });

    await prisma.config.upsert({
      where: { key: 'smtp_secure' },
      update: { value: form.get('smtp_secure') === 'on' ? 'on' : 'false' },
      create: { key: 'smtp_secure', value: form.get('smtp_secure') === 'on' ? 'on' : 'false' },
    });

    await prisma.config.upsert({
      where: { key: 'order_paid_email_enabled' },
      update: { value: form.get('order_paid_email_enabled') === 'on' ? 'on' : 'off' },
      create: { key: 'order_paid_email_enabled', value: form.get('order_paid_email_enabled') === 'on' ? 'on' : 'off' },
    });

    await prisma.config.upsert({ where: { key: 'admin_user' }, update: { value: adminUser }, create: { key: 'admin_user', value: adminUser } });
    if (adminPassword) {
      const value = await bcrypt.hash(adminPassword, 10);
      await prisma.config.upsert({ where: { key: 'admin_pwd_hash' }, update: { value }, create: { key: 'admin_pwd_hash', value } });
    }

    const existingTotp = await prisma.config.findUnique({ where: { key: 'totp_secret' } });
    if (form.get('totp_login_only') === 'on') {
      if (existingTotp?.value) {
        await prisma.config.upsert({ where: { key: 'totp_enabled' }, update: { value: 'on' }, create: { key: 'totp_enabled', value: 'on' } });
      } else {
        await prisma.config.upsert({ where: { key: 'totp_login_only' }, update: { value: '' }, create: { key: 'totp_login_only', value: '' } });
        await prisma.config.upsert({ where: { key: 'totp_enabled' }, update: { value: '' }, create: { key: 'totp_enabled', value: '' } });
      }
    } else if (form.get('totp_enabled') === 'on' && !existingTotp?.value) {
      await prisma.config.upsert({ where: { key: 'totp_enabled' }, update: { value: '' }, create: { key: 'totp_enabled', value: '' } });
    }
  }

  const success = action === 'reset_key' ? 'reset_key' : action === 'update_merchant' ? 'merchant' : 'settings';
  const url = new URL(appUrl(redirectTo));
  url.searchParams.set('success', success);
  return NextResponse.redirect(url, { status: 303 });
}

function generateMerchantKey() {
  return `epay_${randomBytes(24).toString('base64url')}`;
}