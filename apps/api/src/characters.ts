import {
  CharacterAllyService,
  CharacterContent,
  CharacterFlaggedItems,
  CharacterKeyItemPromotion,
  CharacterKeyItems,
  CharacterPackService,
  CharacterRuleLimitService,
  CharacterService,
  CharacterTransferLines,
  CharacterUnenabledService,
  CharacterVariantLimits,
  CharacterVariantService,
  CharacterVitals,
  FeatDisplayService,
  GenerateCharacterService,
  HeldContentPacks,
  PathbuilderExportService,
  PathbuilderImportService,
  PioneerFileService,
  PlayService,
  SheetModeService,
} from '@pioneer/character/application';
import {
  characterAllyRoutes,
  characterPackRoutes,
  characterRoutes,
  characterRuleLimitRoutes,
  characterUnenabledRoutes,
  characterVariantRoutes,
  DrizzleCharacterPackRepository,
  DrizzleCharacterRepository,
  DrizzleCharacterRuleLimitRepository,
  DrizzleCharacterVariantRepository,
  DrizzleFeatDisplayRepository,
  DrizzleSheetModeRepository,
  featDisplayRoutes,
  generateCharacterRoutes,
  HttpPathbuilderExportFetcher,
  pathbuilderImportRoutes,
  pioneerFileRoutes,
  playRoutes,
  sheetModeRoutes,
} from '@pioneer/character/infrastructure';
import { PackAccessPolicy } from '@pioneer/homebrew/application';
import { DrizzlePackDependencyRepository, DrizzlePackDirectory } from '@pioneer/homebrew/infrastructure';
import { ContentRepository, StoredContentSource } from '@pioneer/rules/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import { CampaignPackDirectory } from './attached-campaign-pack-directory';
import { CampaignCharacterRoles } from './campaign-character-roles';
import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import type { Database } from './database';
import { HomebrewPackCatalog } from './homebrew-pack-catalog';
import { PioneerEmbeddedHomebrew } from './pioneer-embedded-homebrew';
import { StoredPackLookup } from './stored-pack-lookup';
import { UserOverrideAuthorDirectory } from './user-override-author-directory';

/** What a character is worked out over beyond the build: the homebrew packs it uses and the variant rules enabled. */
interface PackServices {
  readonly packs: CharacterPackService;
  readonly allies: CharacterAllyService;
  readonly variants: CharacterVariantService;
  readonly ruleLimits: CharacterRuleLimitService;
  readonly unenabled: CharacterUnenabledService;
  readonly held: HeldContentPacks;
}

/** What the pack services read a character's content and rows from. */
interface CharacterParts {
  readonly content: StoredContentSource;
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
  const held = new HeldContentPacks(new StoredPackLookup(content), catalog);
  const packs = new CharacterPackService(
    { characters: repository, packs: new DrizzleCharacterPackRepository(db), catalog, campaigns, held },
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
  const unenabled = new CharacterUnenabledService({
    characters: repository,
    content,
    packs,
    variants,
    campaigns,
    held,
  });
  return { packs, variants, ruleLimits, allies, unenabled, held };
}

/** The character context as mounted: its routes, and the Pioneer file export other contexts are wired to. */
export interface Characters {
  readonly routes: ContractRouter['app'];
  readonly pioneerFiles: PioneerFileService;
  /** The rules each character's inventory breaks, for the campaign's review of its party. */
  readonly flaggedItems: CharacterFlaggedItems;
  /** How each character stands, for the campaign's party panel. */
  readonly vitals: CharacterVitals;
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
  const { packs, variants, ruleLimits, allies, unenabled, held } = packServices(db, clock, { content, repository });
  const characterContent = new CharacterContent(content, packs, {
    variants,
    limits: ruleLimits,
    held,
  });
  const service = new CharacterService(repository, characterContent, clock)
    .withCampaignRoles(new CampaignCharacterRoles(db))
    .withAuthors(new UserOverrideAuthorDirectory(db));
  const pathbuilder = {
    importer: new PathbuilderImportService(
      { characters: repository, content, variants: new DrizzleCharacterVariantRepository(db) },
      clock,
    ),
    exports: new PathbuilderExportService(new HttpPathbuilderExportFetcher()),
  };
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
    vitals: new CharacterVitals(characterContent),
    keyItems: new CharacterKeyItems(repository, clock),
    keyItemPromotion: new CharacterKeyItemPromotion(repository, characterContent, clock),
    transferLines: new CharacterTransferLines(repository, characterContent),
    routes: characterRoutes(service, authenticator)
      .use(pathbuilderImportRoutes(pathbuilder, authenticator))
      .use(pioneerFileRoutes(pioneerFiles, authenticator))
      .use(sheetModeRoutes(sheetModes, authenticator))
      .use(generateCharacterRoutes(new GenerateCharacterService(repository, characterContent, clock), authenticator))
      .use(featDisplayRoutes(featDisplay, authenticator))
      .use(characterAllyRoutes(allies, authenticator))
      .use(characterPackRoutes(packs, authenticator))
      .use(characterVariantRoutes(variants, authenticator))
      .use(characterRuleLimitRoutes(ruleLimits, authenticator))
      .use(characterUnenabledRoutes(unenabled, authenticator))
      .use(playRoutes(play, authenticator)),
  };
}
