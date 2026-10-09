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
import { Discord, generateCodeVerifier, generateState } from 'arctic';
import { z } from 'zod';

import { getJson } from './provider-http';
import type { OAuthCredentials } from './provider-http';

const USER_URL = 'https://discord.com/api/v10/users/@me';
/** Profile and email (with its verified flag); no guilds, no messages. */
const SCOPES = ['identify', 'email'];

const DiscordUser = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  global_name: z.string().nullish(),
  avatar: z.string().nullish(),
  email: z.string().nullish(),
  verified: z.boolean().optional(),
});
type DiscordUser = z.infer<typeof DiscordUser>;

/** Discord's `/users/@me` as a Pioneer profile. Exported for tests. */
export function discordProfile(user: DiscordUser): ProviderProfile {
  const email = EmailAddress.safeParse(user.email);
  const avatarHash = user.avatar ?? undefined;
  const avatar = AvatarUrl.safeParse(
    avatarHash === undefined ? undefined : `https://cdn.discordapp.com/avatars/${user.id}/${avatarHash}.png`,
  );
  const name = user.global_name?.trim() ?? '';
  return {
    provider: OAuthProvider.Discord,
    subject: ProviderSubject.parse(user.id),
    displayName: DisplayName.parse((name === '' ? user.username : name).slice(0, DISPLAY_NAME_MAX_LENGTH)),
    avatarUrl: avatar.success ? avatar.data : undefined,
    email: email.success ? email.data : undefined,
    emailVerified: email.success && user.verified === true,
  };
}

/** Sign in with Discord: authorization code flow with PKCE (S256), through Arctic. */
export class DiscordProvider extends OAuthProviderPort {
  public readonly provider = OAuthProvider.Discord;
  readonly #client: Discord;

  public constructor(credentials: OAuthCredentials) {
    super();
    this.#client = new Discord(credentials.clientId, credentials.clientSecret, credentials.redirectUri.toString());
  }

  public override authorize(): AuthorizationRequest {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    return { url: this.#client.createAuthorizationURL(state, codeVerifier, SCOPES), state, codeVerifier };
  }

  public override async profile(code: string, codeVerifier: string): Promise<ProviderProfile> {
    const tokens = await this.#client.validateAuthorizationCode(code, codeVerifier);
    const user = await getJson(USER_URL, tokens.accessToken(), DiscordUser);
    return discordProfile(user);
  }
}
