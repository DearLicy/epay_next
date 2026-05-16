import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

let cachedAppUrl: string | null = null;

function readDotenvAppUrl() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return '';

  const contents = readFileSync(envPath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    if (key !== 'APP_URL') continue;
    return trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
  }

  return '';
}

function appUrlBase() {
  cachedAppUrl ||= (readDotenvAppUrl() || process.env.APP_URL || '').replace(/\/$/, '');
  if (!cachedAppUrl) throw new Error('APP_URL 未配置');
  return cachedAppUrl;
}

export function appUrl(path = '') {
  const base = appUrlBase();
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}