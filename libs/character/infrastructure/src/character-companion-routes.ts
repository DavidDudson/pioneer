import type { CharacterCompanionService } from '@pioneer/character/application';
import { CharacterCompanionContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for the companions a character owns (ADR-0079). Every route needs a signed-in user (401 otherwise);
 * only the owner reads or changes them.
 */
export function characterCompanionRoutes(
  service: CharacterCompanionService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('character-companion-routes')
    .handleSignedIn(CharacterCompanionContract.companions, auth, async ({ actor, params }) =>
      service.list(actor, params.id),
    )
    .handleSignedIn(CharacterCompanionContract.addCompanion, auth, async ({ actor, params, body }) =>
      service.add(actor, params.id, body),
    )
    .handleSignedIn(CharacterCompanionContract.archiveCompanion, auth, async ({ actor, params, body }) =>
      service.archive(actor, { character: params.id, companion: params.companionId }, body),
    )
    .handleSignedIn(CharacterCompanionContract.restoreCompanion, auth, async ({ actor, params, body }) =>
      service.restore(actor, { character: params.id, companion: params.companionId }, body),
    ).app;
}
