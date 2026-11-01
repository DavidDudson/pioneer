import type { CharacterId, CharacterSheetBundle } from '@pioneer/character/domain';
import type { UserId } from '@pioneer/shared/kernel';

import type { CharacterPackService } from './character-pack-service';
import type { CharacterRuleLimitService } from './character-rule-limit-service';
import type { CharacterService } from './character-service';
import type { CharacterUnenabledService } from './character-unenabled-service';
import type { CharacterVariantService } from './character-variant-service';
import type { FeatDisplayService } from './feat-display-service';
import type { PlayService } from './play-service';
import type { SheetModeService } from './sheet-mode-service';

/**
 * The use cases behind the routes the bundle answers for. Each keeps its own access policy, so the bundle says what the
 * routes would; all but the sheet and its rule limits are the owner's alone, so are asked only of the owner.
 */
export interface CharacterSheetSources {
  readonly characters: Pick<CharacterService, 'get' | 'ruleLimits' | 'sheet'>;
  readonly play: Pick<PlayService, 'get'>;
  readonly sheetModes: Pick<SheetModeService, 'get'>;
  readonly featDisplay: Pick<FeatDisplayService, 'get'>;
  readonly packs: Pick<CharacterPackService, 'packs'>;
  readonly variants: Pick<CharacterVariantService, 'variantRules'>;
  readonly ruleLimits: Pick<CharacterRuleLimitService, 'ruleLimitSettings'>;
  readonly unenabled: Pick<CharacterUnenabledService, 'unenabled'>;
}

/** Opens a sheet in one read: `CharacterSheetBundle`. */
export class CharacterSheetBundleService {
  readonly #sources: CharacterSheetSources;

  public constructor(sources: CharacterSheetSources) {
    this.#sources = sources;
  }

  /**
   * The sheet and what it always needs. Reading the character applies the access policy first, so someone who may not
   * see it gets a 404 before anything else is read; the owner-only parts are then read, with the sheet, for the owner
   * alone.
   */
  public async bundle(actor: UserId, id: CharacterId): Promise<CharacterSheetBundle> {
    const { characters, play, sheetModes, featDisplay, packs, variants, ruleLimits, unenabled } = this.#sources;
    const character = await characters.get(actor, id);
    const isOwner = character.ownerId === actor;
    const [sheet, limits, playState, sheetMode, display, packList, variantRules, limitSettings, notEnabled] =
      await Promise.all([
        characters.sheet(character),
        characters.ruleLimits(actor, id),
        isOwner ? play.get(actor, id) : undefined,
        isOwner ? sheetModes.get(actor, id) : undefined,
        isOwner ? featDisplay.get(actor, id) : undefined,
        isOwner ? packs.packs(actor, id) : undefined,
        isOwner ? variants.variantRules(actor, id) : undefined,
        isOwner ? ruleLimits.ruleLimitSettings(actor, id) : undefined,
        isOwner ? unenabled.unenabled(actor, id) : undefined,
      ]);
    return {
      sheet,
      ruleLimits: limits,
      ...(playState === undefined ? {} : { play: playState }),
      ...(sheetMode === undefined ? {} : { sheetMode }),
      ...(display === undefined ? {} : { featDisplay: display }),
      ...(packList === undefined ? {} : { packs: packList }),
      ...(variantRules === undefined ? {} : { variantRules }),
      ...(limitSettings === undefined ? {} : { ruleLimitSettings: limitSettings }),
      ...(notEnabled === undefined ? {} : { unenabled: notEnabled }),
    };
  }
}
