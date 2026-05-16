import { cookies } from 'next/headers';
import crypto from 'crypto';

const CAPTCHA_COOKIE = 'epay_admin_captcha';
const CAPTCHA_TTL_SECONDS = 300;
const SECRET = process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'epay-next-local-secret';

function sign(value: string) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

export function createCaptchaText() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function setCaptchaCookie(text: string) {
  const expires = Date.now() + CAPTCHA_TTL_SECONDS * 1000;
  const payload = `${text.toUpperCase()}.${expires}`;
  const jar = await cookies();
  jar.set(CAPTCHA_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CAPTCHA_TTL_SECONDS,
  });
}

export async function verifyCaptcha(input: string) {
  const jar = await cookies();
  const raw = jar.get(CAPTCHA_COOKIE)?.value;
  jar.delete(CAPTCHA_COOKIE);
  if (!raw || !input) return false;
  const [text, expires, mac] = raw.split('.');
  const payload = `${text}.${expires}`;
  if (!text || !expires || !mac || sign(payload) !== mac) return false;
  if (Number(expires) < Date.now()) return false;
  return text.toUpperCase() === input.trim().toUpperCase();
}

export function captchaSvg(text: string) {
  const letters = text.split('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="44" viewBox="0 0 120 44">
    <rect width="120" height="44" rx="12" fill="#f5f3ff"/>
    <path d="M8 34 C32 6, 66 42, 112 12" stroke="#c4b5fd" stroke-width="2" fill="none" opacity=".7"/>
    <path d="M4 14 C35 30, 70 0, 116 28" stroke="#ddd6fe" stroke-width="2" fill="none" opacity=".9"/>
    ${letters.map((letter, index) => `<text x="${18 + index * 23}" y="29" font-size="24" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-weight="700" fill="#6d28d9" transform="rotate(${[-8, 5, -4, 8][index]} ${18 + index * 23} 26)">${letter}</text>`).join('')}
  </svg>`;
}