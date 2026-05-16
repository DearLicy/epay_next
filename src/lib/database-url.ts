function requiredEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') throw new Error(`Missing required env: ${name}`);
  return value;
}

export function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const user = encodeURIComponent(requiredEnv('DB_USER', 'root'));
  const password = encodeURIComponent(process.env.DB_PASSWORD ?? '');
  const host = requiredEnv('DB_HOST', '127.0.0.1');
  const port = requiredEnv('DB_PORT', '3306');
  const database = encodeURIComponent(requiredEnv('DB_NAME', 'epay_next'));
  const auth = password ? `${user}:${password}` : user;

  return `mysql://${auth}@${host}:${port}/${database}`;
}