import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createAdminSession } from '@/lib/admin-auth';
import { verifyCaptcha } from '@/lib/admin-captcha';
import { appUrl } from '@/lib/epay/config';
import { verifyTotpToken } from '@/lib/totp';

function emailCodeSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || 'epay-next-local-secret';
}

function emailCodeHash(email: string, code: string, expires: string) {
  return crypto.createHash('sha256').update(`${email}:${code}:${expires}:${emailCodeSecret()}`).digest('hex');
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const mode = String(form.get('mode') || '').trim();
  const username = String(form.get('username') || '');
  const password = String(form.get('password') || '');
  const emailCode = String(form.get('email_code') || '').trim();
  const totpCode = String(form.get('totp_code') || '').trim();
  const captcha = String(form.get('captcha') || '').trim();

  const config = Object.fromEntries((await prisma.config.findMany()).map((row) => [row.key, row.value || '']));

  if (config.login_captcha_enabled === 'on' && !(await verifyCaptcha(captcha))) {
    return NextResponse.redirect(appUrl('/admin/login?error=captcha'), { status: 303 });
  }

  const mailOnly = config.mail_login_only === 'on';
  const totpOnly = config.totp_login_only === 'on';
  const mailEnabled = config.mail_login_enabled === 'on' || mailOnly;
  const totpEnabled = config.totp_enabled === 'on' || totpOnly;
  const onlyModesEnabled = mailOnly || totpOnly;
  const requestedMode = mode || (emailCode ? 'mail' : username || password ? 'password' : totpCode ? 'totp' : 'password');

  let ok = false;
  let failure = requestedMode === 'totp' ? 'totp' : requestedMode === 'mail' ? 'email_code' : 'password';

  if (requestedMode === 'password') {
    if (onlyModesEnabled) {
      ok = false;
      failure = mailOnly ? 'email_code' : 'totp';
    } else {
      const expectedUser = config.admin_user || 'admin';
      const passwordHash = config.admin_pwd_hash || '';
      ok = username === expectedUser && Boolean(passwordHash) && (await bcrypt.compare(password, passwordHash));
      failure = 'password';
    }
  }

  if (requestedMode === 'mail') {
    if (!mailEnabled || (!mailOnly && totpOnly)) {
      ok = false;
      failure = 'email_code';
    } else {
      const expires = config.login_email_code_expires || '0';
      const hash = config.login_email_code_hash || '';
      const target = config.login_email_code_target || '';
      const email = String(config.admin_email || '').trim();
      ok = Boolean(email) && email === target && Number(expires) >= Date.now() && hash === emailCodeHash(email, emailCode, expires);
      failure = 'email_code';
    }
  }

  if (requestedMode === 'totp') {
    ok = totpEnabled && verifyTotpToken(totpCode, config.totp_secret || '');
    failure = 'totp';
  }

  if (ok && requestedMode !== 'totp' && totpEnabled && !mailOnly) {
    const totpOk = verifyTotpToken(totpCode, config.totp_secret || '');
    ok = totpOk;
    if (!totpOk) failure = 'totp';
  }

  if (!ok) {
    return NextResponse.redirect(appUrl(`/admin/login?error=${failure}`), { status: 303 });
  }

  await prisma.config.deleteMany({ where: { key: { in: ['login_email_code_hash', 'login_email_code_expires', 'login_email_code_target', 'login_email_code_cooldown_until'] } } });
  await createAdminSession();
  return NextResponse.redirect(appUrl('/admin?success=login'), { status: 303 });
}