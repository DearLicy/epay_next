export function appUrl(path = '') {
  const base = process.env.APP_URL?.replace(/\/$/, '');
  if (!base) throw new Error('APP_URL 未配置');
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}