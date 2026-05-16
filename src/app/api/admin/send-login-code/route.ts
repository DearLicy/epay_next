import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendLoginCodeMail } from '@/lib/mail';

const COOLDOWN_MS = 60_000;

function emailCodeSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || 'epay-next-local-secret';
}

function emailCodeHash(email: string, code: string, expires: string) {
  return crypto.createHash('sha256').update(`${email}:${code}:${expires}:${emailCodeSecret()}`).digest('hex');
}

export async function POST() {
  const config = Object.fromEntries((await prisma.config.findMany()).map((row) => [row.key, row.value || '']));
  const email = String(config.admin_email || '').trim();
  const mailOnly = config.mail_login_only === 'on';
  const totpOnly = config.totp_login_only === 'on';
  const mailEnabled = config.mail_login_enabled === 'on' || mailOnly;
  if (!mailEnabled || (!mailOnly && totpOnly) || !email) {
    return Response.json({ ok: false, message: '邮件登录未启用或管理员邮箱未配置。' }, { status: 400 });
  }

  const now = Date.now();
  const cooldownUntil = Number(config.login_email_code_cooldown_until || '0');
  if (cooldownUntil > now) {
    return Response.json(
      { ok: false, message: '验证码获取过于频繁，请稍后再试。', retryAfter: Math.ceil((cooldownUntil - now) / 1000) },
      { status: 429 },
    );
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = String(now + 5 * 60 * 1000);
  const token = emailCodeHash(email, code, expires);
  const nextCooldownUntil = now + COOLDOWN_MS;
  await prisma.$transaction([
    prisma.config.upsert({ where: { key: 'login_email_code_hash' }, update: { value: token }, create: { key: 'login_email_code_hash', value: token } }),
    prisma.config.upsert({ where: { key: 'login_email_code_expires' }, update: { value: expires }, create: { key: 'login_email_code_expires', value: expires } }),
    prisma.config.upsert({ where: { key: 'login_email_code_target' }, update: { value: email }, create: { key: 'login_email_code_target', value: email } }),
    prisma.config.upsert({ where: { key: 'login_email_code_cooldown_until' }, update: { value: String(nextCooldownUntil) }, create: { key: 'login_email_code_cooldown_until', value: String(nextCooldownUntil) } }),
  ]);
  await sendLoginCodeMail(email, code);

  return Response.json({ ok: true, message: '邮件验证码已发送。', cooldownUntil: nextCooldownUntil });
}
