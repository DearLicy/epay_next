import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';
import { getDatabaseUrl } from '../src/lib/database-url';

process.env.DATABASE_URL = getDatabaseUrl();

const prismaBin = resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');
const command = existsSync(prismaBin) ? prismaBin : 'prisma';
const result = spawnSync(command, process.argv.slice(2), {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

process.exit(result.status ?? 1);