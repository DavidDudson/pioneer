import { OAuthProviderPort } from '@pioneer/identity/application';
import type { AuthorizationRequest } from '@pioneer/identity/application';
import {
  AvatarUrl,
  DISPLAY_NAME_MAX_LENGTH,
  DisplayName,
  EmailAddress,
  OAuthProvider,
  ProviderSubject,
} from '@pioneer/identity/domain';
import type { ProviderProfile } from '@pioneer/identity/domain';
import { decodeIdToken, generateCodeVerifier, generateState, Google } from 'arctic';
import * as z from 'zod';

import type { OAuthCredentials } from './provider-http';

/** OpenID Connect: an ID token with profile and email claims, nothing else. */
const SCOPES = ['openid', 'profile', 'email'];

/** Google's documented issuers. */
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

const GoogleClaims = z.object({
  iss: z.enum(GOOGLE_ISSUERS),
  aud: z.string(),
  sub: z.string().min(1),
  name: z.string().optional(),
  picture: z.string().optional(),
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
});
type GoogleClaims = z.infer<typeof GoogleClaims>;

/** Google's ID token claims as a Pioneer profile. Exported for tests. */
export function googleProfile(claims: GoogleClaims): ProviderProfile {
  const email = EmailAddress.safeParse(claims.email);
  const avatar = AvatarUrl.safeParse(claims.picture);
  const name = claims.name?.trim() ?? '';
  // Google sends a name with the profile scope; the address, then the id, only stand in if it doesn't.
  const fallback = email.success ? email.data.slice(0, email.data.indexOf('@')) : claims.sub;
  return {
    provider: OAuthProvider.Google,
    subject: ProviderSubject.parse(claims.sub),
    displayName: DisplayName.parse((name === '' ? fallback : name).slice(0, DISPLAY_NAME_MAX_LENGTH)),
    avatarUrl: avatar.success ? avatar.data : undefined,
    email: email.success ? email.data : undefined,
    emailVerified: email.success && claims.email_verified === true,
  };
}

/** Sign in with Google: OpenID Connect authorization code flow with PKCE (S256), through Arctic. */
export class GoogleProvider extends OAuthProviderPort {
  public readonly provider = OAuthProvider.Google;
  readonly #client: Google;
  readonly #clientId: string;

  public constructor(credentials: OAuthCredentials) {
    super();
    this.#clientId = credentials.clientId;
    this.#client = new Google(credentials.clientId, credentials.clientSecret, credentials.redirectUri.toString());
  }

  public override authorize(): AuthorizationRequest {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    return { url: this.#client.createAuthorizationURL(state, codeVerifier, SCOPES), state, codeVerifier };
  }

  /**
   * The ID token comes straight from Google's token endpoint over TLS, so TLS stands in for its
   * signature (OpenID Connect Core 3.1.3.7); issuer and audience are still checked.
   */
  public override async profile(code: string, codeVerifier: string): Promise<ProviderProfile> {
    const tokens = await this.#client.validateAuthorizationCode(code, codeVerifier);
    const claims = GoogleClaims.parse(decodeIdToken(tokens.idToken()));
    if (claims.aud !== this.#clientId) {
      throw new Error('Google ID token was issued to another client');
    }
    return googleProfile(claims);
  }
}
