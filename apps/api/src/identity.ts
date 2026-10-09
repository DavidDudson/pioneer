import { IdentityService } from '@pioneer/identity/application';
import type { OAuthProviderPort } from '@pioneer/identity/application';
import { AuthPath, OAuthProvider } from '@pioneer/identity/domain';
import {
  DrizzleSessionRepository,
  DrizzleUserRepository,
  GitHubProvider,
  identityRoutes,
} from '@pioneer/identity/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { Elysia } from 'elysia';

import type { Database } from './database';
import type { Env } from './env';

/** Mount point of the API; OAuth callback URLs include it. */
export const API_PREFIX = '/api';

/** The sign-in providers whose credentials are configured. */
function providers(env: Env): OAuthProviderPort[] {
  if (env.PUBLIC_ORIGIN === undefined || env.GITHUB_CLIENT_ID === undefined || env.GITHUB_CLIENT_SECRET === undefined) {
    return [];
  }
  return [
    new GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      redirectUri: new URL(`${API_PREFIX}${AuthPath.callback(OAuthProvider.GitHub)}`, env.PUBLIC_ORIGIN),
    }),
  ];
}

/** Identity's part of the composition root: service, configured providers and routes. */
export function identity(db: Database, env: Env, clock: Clock): Elysia {
  const service = new IdentityService(new DrizzleUserRepository(db), new DrizzleSessionRepository(db), clock);
  // Secure cookies unless the public origin is plain http (local development).
  const secure = env.PUBLIC_ORIGIN?.startsWith('https:') ?? true;
  return identityRoutes(service, providers(env), { secure });
}
