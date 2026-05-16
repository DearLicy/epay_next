import { NextResponse } from 'next/server';
import { destroyAdminSession } from '@/lib/admin-auth';
import { appUrl } from '@/lib/epay/config';

export async function POST() {
  await destroyAdminSession();
  return NextResponse.redirect(appUrl('/admin/login?success=logout'), { status: 303 });
}