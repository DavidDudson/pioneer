import type { CharacterRuleLimitService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for the table limits a character sets. Every route needs a signed-in user (401 otherwise); who may read
 * or change them is the service's policy.
 */
export function characterRuleLimitRoutes(
  service: CharacterRuleLimitService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('character-rule-limit-routes')
    .handleSignedIn(CharacterContract.ruleLimitSettings, auth, async ({ actor, params }) =>
      service.ruleLimitSettings(actor, params.id),
    )
    .handleSignedIn(CharacterContract.setRuleLimitSetting, auth, async ({ actor, params, body }) =>
      service.set(actor, params.id, { limit: params.limit, value: body.value }),
    )
    .handleSignedIn(CharacterContract.resetRuleLimitSetting, auth, async ({ actor, params }) =>
      service.reset(actor, params.id, params.limit),
    ).app;
}
