import { NextRequest } from 'next/server';

export async function readRequestParams(request: NextRequest): Promise<Record<string, string>> {
  const fromQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
  if (Object.keys(fromQuery).length > 0) return fromQuery;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    return Object.fromEntries(Object.entries(body).map(([key, value]) => [key, value == null ? '' : String(value)]));
  }

  const text = await request.text();
  return Object.fromEntries(new URLSearchParams(text).entries());
}

export function getClientIp(request: NextRequest, fallback?: string): string {
  return (
    fallback ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export function jsonError(message: string, code = -1) {
  return Response.json({ code, msg: message }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export function htmlError(message: string, status = 400) {
  return new Response(`<!doctype html><meta charset="utf-8"><title>支付错误</title><div style="font-family:Arial,sans-serif;max-width:640px;margin:80px auto;padding:24px;border:1px solid #eee;border-radius:16px"><h2>支付错误</h2><p>${escapeHtml(message)}</p></div>`, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export function escapeHtml(input: string): string {
  return input.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char));
}