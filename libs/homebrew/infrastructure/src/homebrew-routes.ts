import type { HomebrewPackService, PackDependencyService } from '@pioneer/homebrew/application';
import { HomebrewContract } from '@pioneer/homebrew/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/** The application services the homebrew routes call. */
export interface HomebrewServices {
  readonly packs: HomebrewPackService;
  readonly dependencies: PackDependencyService;
}

/**
 * HTTP adapter: binds the homebrew contract to the application services. Every route needs a signed-in user (401
 * otherwise); which packs that user may read or change is the services' policy.
 */
export function homebrewRoutes(
  { packs, dependencies }: HomebrewServices,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('homebrew-routes')
    .handleSignedIn(HomebrewContract.list, auth, async ({ actor }) => [...(await packs.list(actor))])
    .handleSignedIn(HomebrewContract.archived, auth, async ({ actor }) => [...(await packs.listArchived(actor))])
    .handleSignedIn(HomebrewContract.get, auth, async ({ actor, params }) => packs.get(actor, params.id))
    .handleSignedIn(HomebrewContract.create, auth, async ({ actor, body }) => packs.create(actor, body))
    .handleSignedIn(HomebrewContract.setVisibility, auth, async ({ actor, params, body }) =>
      packs.setVisibility(actor, params.id, body.visibility),
    )
    .handleSignedIn(HomebrewContract.archive, auth, async ({ actor, params }) => packs.archive(actor, params.id))
    .handleSignedIn(HomebrewContract.restore, auth, async ({ actor, params }) => packs.restore(actor, params.id))
    .handleSignedIn(HomebrewContract.dependencies, auth, async ({ actor, params }) =>
      dependencies.list(actor, params.id),
    )
    .handleSignedIn(HomebrewContract.addDependency, auth, async ({ actor, params, body }) =>
      dependencies.add(actor, params.id, body),
    )
    .handleSignedIn(HomebrewContract.removeDependency, auth, async ({ actor, params }) =>
      dependencies.remove(actor, params.id, params.dependsOn),
    ).app;
}
