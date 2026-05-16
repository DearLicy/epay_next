import crypto from 'crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret() {
  return Array.from({ length: 32 }, () => BASE32_ALPHABET[crypto.randomInt(BASE32_ALPHABET.length)]).join('');
}

export function verifyTotpToken(token: string, secret: string) {
  if (!token || !secret) return false;
  const normalized = token.replace(/\s/g, '');
  const step = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some((offset) => hotp(secret, step + offset) === normalized);
}

export async function getTotpQrCode(secret: string, account: string) {
  const label = encodeURIComponent(`Next 易支付:${account}`);
  const issuer = encodeURIComponent('Next 易支付');
  const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  return QRCode.toDataURL(uri, { margin: 1, width: 180 });
}

function hotp(secret: string, counter: number) {
  const key = decodeBase32(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

function decodeBase32(input: string) {
  const clean = input.replace(/=+$/g, '').replace(/\s/g, '').toUpperCase();
  let bits = '';
  for (const char of clean) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}