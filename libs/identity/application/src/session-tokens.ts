import { SessionToken, TokenHash } from '@pioneer/identity/domain';
import { randomSecret, sha256Hex } from '@pioneer/shared/kernel';

/** A fresh session token: 256 bits from the platform CSPRNG. */
export function newSessionToken(): SessionToken {
  return SessionToken.parse(randomSecret());
}

/** What the database keeps instead of the token, so a leaked table yields no usable cookie. */
export async function hashSessionToken(token: SessionToken): Promise<TokenHash> {
  return TokenHash.parse(await sha256Hex(token));
}
