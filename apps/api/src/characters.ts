import {
  CharacterContent,
  CharacterRuleLimitService,
  CharacterAllyService,
  CharacterFlaggedItems,
  CharacterKeyItemPromotion,
  CharacterKeyItems,
  CharacterTransferLines,
  CharacterPackService,
  CharacterUnenabledService,
  CharacterVariantLimits,
  CharacterVariantService,
  CharacterService,
  FeatDisplayService,
  PathbuilderImportService,
  PioneerFileService,
  PlayService,
  SheetModeService,
} from '@pioneer/character/application';
import {
  characterAllyRoutes,
  characterPackRoutes,
  characterUnenabledRoutes,
  characterVariantRoutes,
  characterRoutes,
  characterRuleLimitRoutes,
  featDisplayRoutes,
  DrizzleCharacterPackRepository,
  DrizzleCharacterRepository,
  DrizzleCharacterRuleLimitRepository,
  DrizzleCharacterVariantRepository,
  DrizzleFeatDisplayRepository,
  DrizzleSheetModeRepository,
  pathbuilderImportRoutes,
  pioneerFileRoutes,
  playRoutes,
  sheetModeRoutes,
} from '@pioneer/character/infrastructure';
import { PackAccessPolicy } from '@pioneer/homebrew/application';
import { DrizzlePackDependencyRepository, DrizzlePackDirectory } from '@pioneer/homebrew/infrastructure';
import { ContentRepository, StoredContentSource } from '@pioneer/rules/infrastructure';
import type { ContentSource } from '@pioneer/rules/sdk';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import { CampaignPackDirectory } from './attached-campaign-pack-directory';
import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import type { Database } from './database';
import { HomebrewPackCatalog } from './homebrew-pack-catalog';
import { PioneerEmbeddedHomebrew } from './pioneer-embedded-homebrew';

/** What a character is worked out over beyond the build: the homebrew packs it uses and the variant rules enabled. */
interface PackServices {
  readonly packs: CharacterPackService;
  readonly allies: CharacterAllyService;
  readonly variants: CharacterVariantService;
  readonly ruleLimits: CharacterRuleLimitService;
  readonly unenabled: CharacterUnenabledService;
}

/** What the pack services read a character's content and rows from. */
interface CharacterParts {
  readonly content: ContentSource;
  readonly repository: DrizzleCharacterRepository;
}

/** The packs and variant rules a character uses, which a campaign it is attached to decides instead of its owner. */
function packServices(db: Database, clock: Clock, { content, repository }: CharacterParts): PackServices {
  const catalog = new HomebrewPackCatalog(
    new DrizzlePackDirectory(db),
    new DrizzlePackDependencyRepository(db),
    new PackAccessPolicy(new CampaignPackEnablementDirectory(db)),
  );
  const campaigns = new CampaignPackDirectory(db);
  const packs = new CharacterPackService(
    { characters: repository, packs: new DrizzleCharacterPackRepository(db), catalog, campaigns },
    clock,
  );
  const variants = new CharacterVariantService(
    { characters: repository, variants: new DrizzleCharacterVariantRepository(db), content, packs, campaigns },
    clock,
  );
  const ruleLimits = new CharacterRuleLimitService(
    {
      characters: repository,
      limits: new DrizzleCharacterRuleLimitRepository(db),
      campaigns,
      variantLimits: new CharacterVariantLimits({ content, packs, variants }),
    },
    clock,
  );
  const allies = new CharacterAllyService({ characters: repository, campaigns });
  const unenabled = new CharacterUnenabledService({ characters: repository, content, packs, variants, campaigns });
  return { packs, variants, ruleLimits, allies, unenabled };
}

/** The character context as mounted: its routes, and the Pioneer file export other contexts are wired to. */
export interface Characters {
  readonly routes: ContractRouter['app'];
  readonly pioneerFiles: PioneerFileService;
  /** The rules each character's inventory breaks, for the campaign's review of its party. */
  readonly flaggedItems: CharacterFlaggedItems;
  /** The lines a campaign's GM writes into inventories for its key items. */
  readonly keyItems: CharacterKeyItems;
  /** Turns a line a character already has into a key item's holder copy. */
  readonly keyItemPromotion: CharacterKeyItemPromotion;
  /** The lines members offer to each other's characters. */
  readonly transferLines: CharacterTransferLines;
}

/**
 * The character context's part of the composition root: content, services and routes. Content is read from the
 * content tables the seed fills, so a re-seed is served without a restart.
 */
export function characters(db: Database, clock: Clock, authenticator: RequestAuthenticator): Characters {
  const content = new StoredContentSource(new ContentRepository(db));
  const repository = new DrizzleCharacterRepository(db);
  const { packs, variants, ruleLimits, allies, unenabled } = packServices(db, clock, { content, repository });
  const characterContent = new CharacterContent(content, packs, {
    variants,
    limits: ruleLimits,
  });
  const service = new CharacterService(repository, characterContent, clock);
  const importer = new PathbuilderImportService(
    { characters: repository, content, variants: new DrizzleCharacterVariantRepository(db) },
    clock,
  );
  const homebrew = new PioneerEmbeddedHomebrew(
    db,
    clock,
    new PackAccessPolicy(new CampaignPackEnablementDirectory(db)),
  );
  const pioneerFiles = new PioneerFileService({ repository, content: characterContent, clock, homebrew });
  const sheetModes = new SheetModeService(repository, new DrizzleSheetModeRepository(db), clock);
  const featDisplay = new FeatDisplayService(repository, new DrizzleFeatDisplayRepository(db), clock);
  const play = new PlayService(repository, characterContent, clock);
  return {
    pioneerFiles,
    flaggedItems: new CharacterFlaggedItems(characterContent),
    keyItems: new CharacterKeyItems(repository, clock),
    keyItemPromotion: new CharacterKeyItemPromotion(repository, characterContent, clock),
    transferLines: new CharacterTransferLines(repository),
    routes: characterRoutes(service, authenticator)
      .use(pathbuilderImportRoutes(importer, authenticator))
      .use(pioneerFileRoutes(pioneerFiles, authenticator))
      .use(sheetModeRoutes(sheetModes, authenticator))
      .use(featDisplayRoutes(featDisplay, authenticator))
      .use(characterAllyRoutes(allies, authenticator))
      .use(characterPackRoutes(packs, authenticator))
      .use(characterVariantRoutes(variants, authenticator))
      .use(characterRuleLimitRoutes(ruleLimits, authenticator))
      .use(characterUnenabledRoutes(unenabled, authenticator))
      .use(playRoutes(play, authenticator)),
  };
}
