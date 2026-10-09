import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { OAuthProviderSchema } from './identity-fields';
import type { OAuthProvider } from './identity-fields';
import { User } from './user';

/** Acknowledgement with nothing to return. */
const Done = z.strictObject({});

/** The identity HTTP API, shared by `identity-infrastructure` and `identity-feature`. */
export const IdentityContract = {
  /** The signed-in user; 401 when there is no valid session. */
  me: new Endpoint({
    method: HttpMethod.Get,
    path: '/me',
    params: NoParams,
    query: NoQuery,
    body: NoBody,
    response: User.codec,
  }),
  /** The sign-in providers this server has credentials for, in display order. */
  providers: new Endpoint({
    method: HttpMethod.Get,
    path: '/auth/providers',
    params: NoParams,
    query: NoQuery,
    body: NoBody,
    response: z.array(OAuthProviderSchema),
  }),
  /** Ends the current session and clears its cookie. Succeeds when already signed out. */
  signOut: new Endpoint({
    method: HttpMethod.Post,
    path: '/auth/sign-out',
    params: NoParams,
    query: NoQuery,
    body: NoBody,
    response: Done,
  }),
} as const;

/** Query parameter carrying the path to return to after sign-in. */
export const RETURN_TO_PARAM = 'returnTo';

/**
 * Browser navigations, not API calls: they answer with redirects to and from the provider, so
 * they sit outside `IdentityContract`. Paths are relative to the API base (`/api`).
 */
export const AuthPath = {
  login: (provider: OAuthProvider): `/auth/${OAuthProvider}/login` => `/auth/${provider}/login`,
  callback: (provider: OAuthProvider): `/auth/${OAuthProvider}/callback` => `/auth/${provider}/callback`,
} as const;

/** Web route listing the sign-in providers. */
export const SIGN_IN_PATH = '/account/sign-in';

/** Web route shown when a sign-in attempt fails (denied, expired or tampered state). */
export const SIGN_IN_FAILED_PATH = '/account/sign-in-failed';
