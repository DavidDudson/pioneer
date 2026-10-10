import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { OAuthProviderSchema, SessionId } from './identity-fields';
import type { OAuthProvider } from './identity-fields';
import { Preferences } from './preferences';
import { SessionSummary } from './session';
import { User } from './user';

/** Acknowledgement with nothing to return. */
const Done = z.strictObject({});

const BySessionId = z.object({ id: SessionId });

/** A PATCH that changes nothing would only touch `updated_at` and the audit log, so it is a 422. */
const PreferencesChange = Preferences.refine((change) => Object.values(change).some((value) => value !== undefined));

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
  /** The signed-in user's unexpired sessions, most recently seen first. */
  sessions: new Endpoint({
    method: HttpMethod.Get,
    path: '/me/sessions',
    params: NoParams,
    query: NoQuery,
    body: NoBody,
    response: z.array(SessionSummary),
  }),
  /** Ends one of the signed-in user's sessions; 404 for anyone else's. Ending the current one signs out. */
  revokeSession: new Endpoint({
    method: HttpMethod.Delete,
    path: '/me/sessions/:id',
    params: BySessionId,
    query: NoQuery,
    body: NoBody,
    response: Done,
  }),
  /** Ends every session the signed-in user has, this one included, and clears its cookie. */
  signOutEverywhere: new Endpoint({
    method: HttpMethod.Post,
    path: '/auth/sign-out-everywhere',
    params: NoParams,
    query: NoQuery,
    body: NoBody,
    response: Done,
  }),
  /** The signed-in user's display preferences; fields never chosen are absent. */
  preferences: new Endpoint({
    method: HttpMethod.Get,
    path: '/me/preferences',
    params: NoParams,
    query: NoQuery,
    body: NoBody,
    response: Preferences,
  }),
  /** Changes the given preferences and leaves the rest; answers with all of them. */
  updatePreferences: new Endpoint({
    method: HttpMethod.Patch,
    path: '/me/preferences',
    params: NoParams,
    query: NoQuery,
    body: PreferencesChange,
    response: Preferences,
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

/** Web route of the signed-in user's account page. */
export const ACCOUNT_PATH = '/account';

/** Web route of the signed-in user's display preferences. */
export const SETTINGS_PATH = '/account/settings';

/** Web route listing the sign-in providers. */
export const SIGN_IN_PATH = '/account/sign-in';

/** Web route shown when a sign-in attempt fails (denied, expired or tampered state). */
export const SIGN_IN_FAILED_PATH = '/account/sign-in-failed';
