import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { appUrl } from '@/lib/epay/config';

export const ADMIN_SESSION_COOKIE = 'epay_admin_session';
const SESSION_TTL_DAYS = 7;

export async function createAdminSession() {
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.adminSession.create({ data: { id, expiresAt } });
  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const id = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (id) await prisma.adminSession.deleteMany({ where: { id } });
  jar.delete(ADMIN_SESSION_COOKIE);
}

export async function getAdminSession() {
  const jar = await cookies();
  const id = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!id) return null;
  const session = await prisma.adminSession.findUnique({ where: { id } });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.adminSession.delete({ where: { id } });
    return null;
  }
  return session;
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect(appUrl('/admin/login'));
  return session;
}