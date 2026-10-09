import type { PreferencesService } from '@pioneer/identity/application';
import { IdentityContract } from '@pioneer/identity/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';
import type { Elysia } from 'elysia';

/**
 * HTTP adapter for the signed-in user's display preferences. Each request acts on the caller's own
 * preferences only, and is authenticated before its body is read.
 */
export function preferenceRoutes(preferences: PreferencesService, auth: RequestAuthenticator): Elysia {
  return new ContractRouter('preference-routes')
    .handleSignedIn(IdentityContract.preferences, auth, async ({ actor }) => preferences.get(actor))
    .handleSignedIn(IdentityContract.updatePreferences, auth, async ({ actor, body }) =>
      preferences.update(actor, body),
    ).app;
}
