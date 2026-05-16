import { prisma } from '@/lib/db';
export { appUrl } from '@/lib/server-app-url';

export async function getConfigMap() {
  const rows = await prisma.config.findMany();
  return Object.fromEntries(rows.map((row) => [row.key, row.value ?? '']));
}

export async function getConfig(key: string, fallback = '') {
  const row = await prisma.config.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

