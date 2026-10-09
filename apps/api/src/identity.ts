import { IdentityService } from '@pioneer/identity/application';
import type { OAuthProviderPort } from '@pioneer/identity/application';
import { AuthPath, OAuthProvider } from '@pioneer/identity/domain';
import {
  csrfGuard,
  DiscordProvider,
  DrizzleSessionRepository,
  DrizzleUserRepository,
  GitHubProvider,
  GoogleProvider,
  identityRoutes,
  sessionSweep,
} from '@pioneer/identity/infrastructure';
import type { OAuthCredentials } from '@pioneer/identity/infrastructure';
import { Milliseconds } from '@pioneer/shared/kernel';
import type { Clock } from '@pioneer/shared/kernel';
import type { Elysia } from 'elysia';

import type { Database } from './database';
import type { Env } from './env';

/** Mount point of the API; OAuth callback URLs include it. */
export const API_PREFIX = '/api';

/** How often expired sessions are deleted. They stop authenticating at expiry regardless. */
const SESSION_SWEEP_INTERVAL = Milliseconds.parse(3_600_000);

/** A provider's two variables, as read from the environment. */
interface ProviderEnv {
  readonly clientId: string | undefined;
  readonly clientSecret: string | undefined;
}

/** One provider's OAuth app from the environment, or `undefined` when it is not configured. */
function credentials(
  env: Env,
  provider: OAuthProvider,
  { clientId, clientSecret }: ProviderEnv,
): OAuthCredentials | undefined {
  if (env.PUBLIC_ORIGIN === undefined || clientId === undefined || clientSecret === undefined) {
    return undefined;
  }
  const redirectUri = new URL(`${API_PREFIX}${AuthPath.callback(provider)}`, env.PUBLIC_ORIGIN);
  return { clientId, clientSecret, redirectUri };
}

/** The sign-in providers whose credentials are configured, in the order the sign-in page lists them. */
function providers(env: Env): OAuthProviderPort[] {
  const github = credentials(env, OAuthProvider.GitHub, {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  });
  const discord = credentials(env, OAuthProvider.Discord, {
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
  });
  const google = credentials(env, OAuthProvider.Google, {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });
  return [
    ...(github === undefined ? [] : [new GitHubProvider(github)]),
    ...(discord === undefined ? [] : [new DiscordProvider(discord)]),
    ...(google === undefined ? [] : [new GoogleProvider(google)]),
  ];
}

/**
 * Identity's part of the composition root: service, configured providers and routes, plus an
 * hourly sweep of expired sessions while the server runs.
 */
export function identity(db: Database, env: Env, clock: Clock): Elysia {
  const service = new IdentityService(new DrizzleUserRepository(db), new DrizzleSessionRepository(db), clock);
  // Secure cookies unless the public origin is plain http (local development).
  const secure = env.PUBLIC_ORIGIN?.startsWith('https:') ?? true;
  return identityRoutes(service, providers(env), { secure }).use(sessionSweep(service, SESSION_SWEEP_INTERVAL));
}

/** Refuses cross-site writes that carry the session cookie, on every API route. */
export function csrf(env: Env): Elysia {
  return csrfGuard(env.PUBLIC_ORIGIN);
}
