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
import { CodeChallengeMethod, generateCodeVerifier, generateState, OAuth2Client } from 'arctic';
import * as z from 'zod';

import { getJson } from './provider-http';
import type { OAuthCredentials } from './provider-http';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const API_URL = 'https://api.github.com';
/** Profile and the verified-flag of each address; nothing that reads repositories. */
const SCOPES = ['read:user', 'user:email'];

const GitHubUser = z.object({
  id: z.number().int(),
  login: z.string().min(1),
  name: z.string().nullish(),
  avatar_url: z.string(),
});
type GitHubUser = z.infer<typeof GitHubUser>;

const GitHubEmails = z.array(z.object({ email: z.string(), primary: z.boolean(), verified: z.boolean() }));
type GitHubEmails = z.infer<typeof GitHubEmails>;

/** GitHub's user and emails responses as a Pioneer profile. Exported for tests. */
export function gitHubProfile(user: GitHubUser, emails: GitHubEmails): ProviderProfile {
  const primary = emails.find((entry) => entry.primary);
  const email = EmailAddress.safeParse(primary?.email);
  const avatar = AvatarUrl.safeParse(user.avatar_url);
  const name = user.name?.trim() ?? '';
  return {
    provider: OAuthProvider.GitHub,
    subject: ProviderSubject.parse(String(user.id)),
    displayName: DisplayName.parse((name === '' ? user.login : name).slice(0, DISPLAY_NAME_MAX_LENGTH)),
    avatarUrl: avatar.success ? avatar.data : undefined,
    email: email.success ? email.data : undefined,
    emailVerified: email.success && primary?.verified === true,
  };
}

/** Sign in with GitHub: authorization code flow with PKCE (S256), through Arctic. */
export class GitHubProvider extends OAuthProviderPort {
  public readonly provider = OAuthProvider.GitHub;
  readonly #client: OAuth2Client;

  public constructor(credentials: OAuthCredentials) {
    super();
    this.#client = new OAuth2Client(credentials.clientId, credentials.clientSecret, credentials.redirectUri.toString());
  }

  public override authorize(): AuthorizationRequest {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = this.#client.createAuthorizationURLWithPKCE(
      AUTHORIZE_URL,
      state,
      CodeChallengeMethod.S256,
      codeVerifier,
      SCOPES,
    );
    return { url, state, codeVerifier };
  }

  public override async profile(code: string, codeVerifier: string): Promise<ProviderProfile> {
    const tokens = await this.#client.validateAuthorizationCode(TOKEN_URL, code, codeVerifier);
    const accessToken = tokens.accessToken();
    const [user, emails] = await Promise.all([
      getJson(`${API_URL}/user`, accessToken, GitHubUser),
      getJson(`${API_URL}/user/emails`, accessToken, GitHubEmails),
    ]);
    return gitHubProfile(user, emails);
  }
}
