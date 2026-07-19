/**
 * KeyHaven TOTP — RFC 6238 time-based one-time passwords in pure TypeScript
 * on top of WebCrypto HMAC-SHA1 (no external deps required at runtime).
 * Compatible with Google Authenticator, Authy, 1Password, etc.
 *
 * All page agents: import from `@/lib/totp` — signatures are stable.
 */

import { randomBytes } from './crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Encode bytes to a base32 string (no padding) — the format authenticator apps expect. */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Decode a base32 string (padding optional, case-insensitive, spaces ignored). */
export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** Generate a fresh 160-bit TOTP secret, base32-encoded (e.g. for QR enrollment). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * Build an `otpauth://` URI for QR-code enrollment.
 * @param secret base32 secret
 * @param account user-facing account label (e.g. vault name / email)
 * @param issuer defaults to 'KeyHaven'
 */
export function totpUri(secret: string, account: string, issuer = 'KeyHaven'): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

async function hmacSha1(keyBytes: Uint8Array, counter: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  // 64-bit big-endian counter (JS-safe: counters fit in 53 bits for millennia)
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const sig = await crypto.subtle.sign('HMAC', key, msg);
  return new Uint8Array(sig);
}

/** RFC 4226 dynamic truncation → n-digit code. */
function truncate(hmac: Uint8Array, digits: number): string {
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (bin % 10 ** digits).toString().padStart(digits, '0');
}

/**
 * Get the current TOTP code and how many seconds remain before it rotates.
 * @param secret base32 secret
 * @param timeStep period in seconds (default 30)
 * @param digits code length (default 6)
 */
export async function getTotpCode(
  secret: string,
  timeStep = 30,
  digits = 6,
): Promise<{ code: string; secondsLeft: number }> {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / timeStep);
  const hmac = await hmacSha1(base32Decode(secret), counter);
  return { code: truncate(hmac, digits), secondsLeft: timeStep - (now % timeStep) };
}

/**
 * Verify a user-entered TOTP code. Accepts ±1 time step to tolerate clock skew.
 * @param secret base32 secret
 * @param code 6-digit code as entered by the user
 * @param window number of steps on each side to accept (default 1)
 */
export async function verifyTotp(
  secret: string,
  code: string,
  window = 1,
  timeStep = 30,
  digits = 6,
): Promise<boolean> {
  const normalized = code.replace(/\s+/g, '');
  if (!new RegExp(`^\\d{${digits}}$`).test(normalized)) return false;
  const keyBytes = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  for (let w = -window; w <= window; w++) {
    const hmac = await hmacSha1(keyBytes, counter + w);
    if (truncate(hmac, digits) === normalized) return true;
  }
  return false;
}