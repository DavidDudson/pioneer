import {
  CharacterSheetBundleService,
  FeatDisplayService,
  PlayService,
  SheetModeService,
} from '@pioneer/character/application';
import type {
  CharacterAllyService,
  CharacterContentSource,
  CharacterPackService,
  CharacterRuleLimitService,
  CharacterService,
  CharacterUnenabledService,
  CharacterVariantService,
} from '@pioneer/character/application';
import {
  characterAllyRoutes,
  characterPackRoutes,
  characterRuleLimitRoutes,
  characterSheetBundleRoutes,
  characterUnenabledRoutes,
  characterVariantRoutes,
  DrizzleFeatDisplayRepository,
  DrizzleSheetModeRepository,
  featDisplayRoutes,
  playRoutes,
  sheetModeRoutes,
} from '@pioneer/character/infrastructure';
import type { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import type { Database } from './database';

/** The use cases behind what a sheet shows beside the build. */
export interface CharacterSheetServices {
  readonly packs: CharacterPackService;
  readonly allies: CharacterAllyService;
  readonly variants: CharacterVariantService;
  readonly ruleLimits: CharacterRuleLimitService;
  readonly unenabled: CharacterUnenabledService;
}

/** What the sheet's routes are served from: the use cases already built, and what the new ones are built over. */
export interface CharacterSheetRoutesPorts {
  readonly db: Database;
  readonly clock: Clock;
  readonly authenticator: RequestAuthenticator;
  readonly repository: DrizzleCharacterRepository;
  readonly content: CharacterContentSource;
  readonly characters: CharacterService;
  readonly services: CharacterSheetServices;
}

/**
 * The routes for what a sheet shows beside the build: play state, the viewer's tab and feat display, packs, variant
 * rules, rule limits, allies and unenabled content, and the bundle that answers for most of them in one request.
 */
export function characterSheetRoutes(ports: CharacterSheetRoutesPorts): ContractRouter['app'] {
  const { db, clock, authenticator, repository, content, characters, services } = ports;
  const sheetModes = new SheetModeService(repository, new DrizzleSheetModeRepository(db), clock);
  const featDisplay = new FeatDisplayService(repository, new DrizzleFeatDisplayRepository(db), clock);
  const play = new PlayService(repository, content, clock);
  const bundle = new CharacterSheetBundleService({ ...services, characters, play, sheetModes, featDisplay });
  return sheetModeRoutes(sheetModes, authenticator)
    .use(featDisplayRoutes(featDisplay, authenticator))
    .use(characterAllyRoutes(services.allies, authenticator))
    .use(characterPackRoutes(services.packs, authenticator))
    .use(characterVariantRoutes(services.variants, authenticator))
    .use(characterRuleLimitRoutes(services.ruleLimits, authenticator))
    .use(characterUnenabledRoutes(services.unenabled, authenticator))
    .use(playRoutes(play, authenticator))
    .use(characterSheetBundleRoutes(bundle, authenticator));
}
