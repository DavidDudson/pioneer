const SECRET_BYTES = 32;
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

/**
 * A bearer secret (session token, invite token): 256 bits from the platform CSPRNG, base64url
 * without padding, so 43 characters. Callers brand it.
 */
export function randomSecret(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)));
}

/**
 * SHA-256 of a secret, lowercase hex: what the database keeps instead of it. A plain hash is enough
 * for 256 random bits, as there is nothing to brute-force.
 */
export async function sha256Hex(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return hex(new Uint8Array(digest));
}
