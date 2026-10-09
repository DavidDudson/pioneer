import type { OAuthProvider, ProviderProfile } from '@pioneer/identity/domain';

/** The per-attempt secrets the login step stores and the callback step needs back. */
export interface AuthorizationRequest {
  /** Where to send the browser. */
  readonly url: URL;
  /** CSRF nonce echoed by the provider; compared on callback. */
  readonly state: string;
  /** PKCE verifier; only its S256 challenge left this server. */
  readonly codeVerifier: string;
}

/**
 * Port for one OAuth provider: build the authorisation redirect, then exchange the callback's
 * code for the user's profile. Adapters (Arctic) live in `identity-infrastructure`.
 */
export abstract class OAuthProviderPort {
  public abstract readonly provider: OAuthProvider;

  public abstract authorize(): AuthorizationRequest;

  /** Throws when the code is invalid, expired or the verifier does not match. */
  public abstract profile(code: string, codeVerifier: string): Promise<ProviderProfile>;
}
