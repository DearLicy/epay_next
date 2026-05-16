import { Decimal } from '@prisma/client/runtime/library';

export function moneyToString(value: Decimal | number | string | null | undefined): string {
  if (value === null || value === undefined) return '0.00';
  const numeric = typeof value === 'string' ? Number(value) : Number(value.toString());
  return numeric.toFixed(2);
}

export function validateMoney(value: string): string | null {
  if (!value || !/^[0-9]+(\.[0-9]{1,2})?$/.test(value)) return '金额不合法';
  if (Number(value) <= 0) return '金额不合法';
  return null;
}

export function generateTradeNo(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${Math.floor(10000 + Math.random() * 90000)}`;
}

export function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}