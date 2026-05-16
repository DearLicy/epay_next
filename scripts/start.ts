import { spawnSync } from 'child_process';
import crypto from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
const defaultSecret = 'change-this-secret-at-least-32-chars';

function parseEnv(contents: string) {
  const values: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const raw = trimmed.slice(index + 1).trim();
    values[key] = raw.replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function ensureEnv() {
  const current = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const values = parseEnv(current);
  const lines = current ? current.split(/\r?\n/) : [];

  const nextValues: Record<string, string> = { ...values };
  if (!nextValues.PORT) nextValues.PORT = '3000';
  if (!nextValues.ADMIN_SESSION_SECRET || nextValues.ADMIN_SESSION_SECRET === defaultSecret) {
    nextValues.ADMIN_SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  }

  const seen = new Set<string>();
  const nextLines = lines.map((line) => {
    const index = line.indexOf('=');
    if (index === -1 || line.trim().startsWith('#')) return line;
    const key = line.slice(0, index).trim();
    if (!(key in nextValues)) return line;
    seen.add(key);
    return `${key}="${nextValues[key]}"`;
  });

  for (const key of ['PORT', 'ADMIN_SESSION_SECRET']) {
    if (!seen.has(key)) nextLines.push(`${key}="${nextValues[key]}"`);
  }

  writeFileSync(envPath, nextLines.filter((line, index, arr) => line !== '' || index < arr.length - 1).join('\n'), 'utf8');
  Object.assign(process.env, nextValues);
}

ensureEnv();

const mode = process.argv[2] === 'start' ? 'start' : 'dev';
const nextBin = resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');
const command = existsSync(nextBin) ? nextBin : 'next';
const args = [mode, '-p', process.env.PORT || '3000'];

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

process.exit(result.status ?? 1);