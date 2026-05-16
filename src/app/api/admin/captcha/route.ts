import { NextResponse } from 'next/server';
import { captchaSvg, createCaptchaText, setCaptchaCookie } from '@/lib/admin-captcha';

export async function GET() {
  const text = createCaptchaText();
  await setCaptchaCookie(text);
  return new NextResponse(captchaSvg(text), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}