import crypto from 'crypto';

export type SignableParams = Record<string, string | number | null | undefined>;

export function normalizeParams(params: URLSearchParams | FormData | SignableParams): Record<string, string> {
  const output: Record<string, string> = {};
  if (params instanceof URLSearchParams) {
    params.forEach((value, key) => {
      output[key] = value;
    });
    return output;
  }
  if (params instanceof FormData) {
    params.forEach((value, key) => {
      output[key] = typeof value === 'string' ? value : value.name;
    });
    return output;
  }
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) output[key] = String(value);
  }
  return output;
}

export function buildSignString(params: SignableParams): string {
  return Object.entries(params)
    .filter(([key, value]) => key !== 'sign' && key !== 'sign_type' && value !== '' && value !== null && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');
}

export function makeSign(params: SignableParams, key: string): string {
  return crypto.createHash('md5').update(buildSignString(params) + key, 'utf8').digest('hex');
}

export function verifySign(params: SignableParams, key: string): boolean {
  const sign = params.sign;
  if (!sign) return false;
  return makeSign(params, key) === String(sign).toLowerCase();
}

export function withSign(params: SignableParams, key: string): Record<string, string> {
  const normalized = normalizeParams(params);
  return { ...normalized, sign: makeSign(normalized, key), sign_type: 'MD5' };
}