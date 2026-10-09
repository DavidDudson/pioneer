import { SessionToken, TokenHash } from '@pioneer/identity/domain';

const TOKEN_BYTES = 32;
const HEX_RADIX = 16;
const HEX_DIGITS_PER_BYTE = 2;

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCodePoint(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(HEX_RADIX).padStart(HEX_DIGITS_PER_BYTE, '0')).join('');
}

/** A fresh session token: 256 bits from the platform CSPRNG. */
export function newSessionToken(): SessionToken {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return SessionToken.parse(base64Url(bytes));
}

/**
 * What the database keeps instead of the token. A plain hash is enough: the token is 256
 * random bits, so there is nothing to brute-force, and a leaked table yields no usable cookie.
 */
export async function hashSessionToken(token: SessionToken): Promise<TokenHash> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return TokenHash.parse(hex(new Uint8Array(digest)));
}
