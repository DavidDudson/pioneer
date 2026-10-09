import type { IdentityService, OAuthProviderPort, PreferencesService } from '@pioneer/identity/application';
import {
  AuthPath,
  IdentityContract,
  RETURN_TO_PARAM,
  returnPathOr,
  SIGN_IN_FAILED_PATH,
} from '@pioneer/identity/domain';
import type { ReturnPath } from '@pioneer/identity/domain';
import { ContractRouter } from '@pioneer/shared/server';
import { Elysia } from 'elysia';

import { SessionAuthenticator } from './session-authenticator';
import {
  AttemptCookie,
  attemptCookie,
  clearedCookie,
  requestCookies,
  SESSION_COOKIE,
  sessionCookie,
  sessionToken,
} from './session-cookie';
import type { CookiePolicy } from './session-cookie';

const FOUND = 302;

/** Everything a provider's login and callback routes need. */
interface SignInFlow {
  readonly provider: OAuthProviderPort;
  readonly service: IdentityService;
  readonly policy: CookiePolicy;
}

/** A callback that matched its login: the code to exchange and where to go afterwards. */
interface VerifiedCallback {
  readonly code: string;
  readonly codeVerifier: string;
  readonly returnTo: ReturnPath;
}

function redirect(location: string, cookies: readonly string[]): Response {
  const headers = new Headers({ location, 'cache-control': 'no-store' });
  for (const value of cookies) {
    headers.append('set-cookie', value);
  }
  return new Response(undefined, { status: FOUND, headers });
}

/** Step 1: remember the attempt in HttpOnly cookies, then send the browser to the provider. */
function startSignIn({ provider, policy }: SignInFlow, request: Request): Response {
  const { url, state, codeVerifier } = provider.authorize();
  const returnTo = returnPathOr(new URL(request.url).searchParams.get(RETURN_TO_PARAM));
  return redirect(url.toString(), [
    attemptCookie(policy, AttemptCookie.State, state),
    attemptCookie(policy, AttemptCookie.Verifier, codeVerifier),
    attemptCookie(policy, AttemptCookie.ReturnTo, returnTo),
  ]);
}

/** The callback's code, if its state matches the attempt cookie (CSRF) and the verifier is there. */
function verifyCallback(request: Request): VerifiedCallback | undefined {
  const query = new URL(request.url).searchParams;
  const cookies = requestCookies(request);
  const state = cookies.get(AttemptCookie.State);
  const codeVerifier = cookies.get(AttemptCookie.Verifier);
  const code = query.get('code');
  if (code === null || state === null || codeVerifier === null || query.get('state') !== state) {
    return undefined;
  }
  return { code, codeVerifier, returnTo: returnPathOr(cookies.get(AttemptCookie.ReturnTo)) };
}

/**
 * Step 2: the provider sent the browser back. Exchange the code with the PKCE verifier and start
 * a session. Every failure lands on the sign-in-failed page; the attempt cookies are always cleared.
 */
async function completeSignIn({ provider, service, policy }: SignInFlow, request: Request): Promise<Response> {
  const cleared = Object.values(AttemptCookie).map((name) => clearedCookie(policy, name));
  const verified = verifyCallback(request);
  if (verified === undefined) {
    return redirect(SIGN_IN_FAILED_PATH, cleared);
  }
  try {
    const profile = await provider.profile(verified.code, verified.codeVerifier);
    const { token } = await service.signIn(profile);
    return redirect(verified.returnTo, [...cleared, sessionCookie(policy, token)]);
  } catch (error: unknown) {
    console.warn(`${provider.provider} sign-in failed`, error);
    return redirect(SIGN_IN_FAILED_PATH, cleared);
  }
}

/** HTTP adapter for identity: provider redirects, sign-out, the current user, their sessions and preferences. */
export function identityRoutes(
  service: IdentityService,
  preferences: PreferencesService,
  providers: readonly OAuthProviderPort[],
  policy: CookiePolicy,
): Elysia {
  const app = new Elysia({ name: 'identity-routes' });
  for (const provider of providers) {
    const flow: SignInFlow = { provider, service, policy };
    app
      .get(AuthPath.login(provider.provider), ({ request }) => startSignIn(flow, request))
      .get(AuthPath.callback(provider.provider), async ({ request }) => completeSignIn(flow, request));
  }
  const auth = new SessionAuthenticator(service, policy);
  const signedOut = clearedCookie(policy, SESSION_COOKIE);
  return app.use(
    new ContractRouter('identity-contract')
      .handle(IdentityContract.me, async (exchange) => {
        const { user } = await auth.signedIn(exchange);
        return user;
      })
      .handle(IdentityContract.providers, async () => providers.map((provider) => provider.provider))
      .handle(IdentityContract.signOut, async ({ request, responseHeaders }) => {
        await service.signOut(sessionToken(request));
        responseHeaders['set-cookie'] = signedOut;
        return {};
      })
      .handle(IdentityContract.sessions, async (exchange) => service.listSessions(await auth.signedIn(exchange)))
      .handle(IdentityContract.revokeSession, async ({ params, ...exchange }) => {
        const { current } = await service.revokeSession(await auth.signedIn(exchange), params.id);
        if (current) {
          exchange.responseHeaders['set-cookie'] = signedOut;
        }
        return {};
      })
      .handle(IdentityContract.signOutEverywhere, async (exchange) => {
        await service.signOutEverywhere(await auth.signedIn(exchange));
        exchange.responseHeaders['set-cookie'] = signedOut;
        return {};
      })
      .handleSignedIn(IdentityContract.preferences, auth, async ({ actor }) => preferences.get(actor))
      .handleSignedIn(IdentityContract.updatePreferences, auth, async ({ actor, body }) =>
        preferences.update(actor, body),
      ).app,
  );
}
