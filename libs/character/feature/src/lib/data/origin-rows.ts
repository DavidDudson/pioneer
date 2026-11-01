import {
  ANCESTRY_SLOT,
  BACKGROUND_SLOT,
  HERITAGE_SLOT,
  originContent,
  rootSlotOptions,
  skillContent,
} from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { Feet, HitPoints, Trait } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import type { AncestryPickerRow, BackgroundPickerRow, HeritagePickerRow } from '@pioneer/rules/ui';

import { traitNames } from '../sheet/sheet-build';
import { sheetEntryNames } from '../sheet/sheet-entry-names';
import { sheetTrainedAgain, trainedAgainNote } from '../sheet/sheet-skill-repeats';
import { sheetSlotContent } from '../sheet/sheet-slot-content';

/** What the origin rows read besides the content: words. */
export interface OriginRowReads {
  readonly translate: (key: string, params?: object) => string;
}

/** The ids a character's own slot offers; undefined without a character, which offers everything it is given. */
function offered(registry: ContentRegistry, character: Character | undefined, slot: SlotKey): Set<string> | undefined {
  return character === undefined
    ? undefined
    : new Set(rootSlotOptions(character.document, sheetSlotContent(registry), slot).map((option) => option.value));
}

/**
 * The rows of the ancestry picker: every ancestry the slot offers (all of them without a character) with the facts to
 * choose by.
 */
export function ancestryRows(
  registry: ContentRegistry,
  character: Character | undefined,
): readonly AncestryPickerRow[] {
  const names = sheetEntryNames(registry);
  const traits = traitNames(registry);
  const slot = offered(registry, character, ANCESTRY_SLOT);
  return originContent(registry)
    .ancestries.filter((ancestry) => slot?.has(ancestry.id) ?? true)
    .map(({ id, name, definition, sources }): AncestryPickerRow => ({
      id,
      name,
      hitPoints: HitPoints.parse(definition.hitPoints),
      size: definition.size,
      speed: Feet.parse(definition.speed),
      boosts: definition.boosts,
      flaws: definition.flaws,
      languages: (definition.languages ?? []).map((language) => names.get(language) ?? language),
      traits: definition.traits.map((trait) => traits.get(Trait.parse(trait)) ?? trait),
      sources,
      disabledReason: undefined,
    }));
}

/** Why a heritage the slot doesn't offer can't be picked: no ancestry yet, or it belongs to another. */
function unavailableReason(
  picked: string | undefined,
  ancestry: string | undefined,
  translate: OriginRowReads['translate'],
): string {
  return picked === undefined
    ? translate('character.sheet.heritageNeedsAncestry')
    : translate('character.sheet.heritageOtherAncestry', { ancestry: ancestry ?? '' });
}

/**
 * The rows of the heritage picker: every heritage loaded, a heritage the character's ancestry can't take staying in
 * the table, disabled, saying whose it is.
 */
export function heritageRows(
  registry: ContentRegistry,
  character: Character,
  { translate }: OriginRowReads,
): readonly HeritagePickerRow[] {
  const content = originContent(registry);
  const slot = offered(registry, character, HERITAGE_SLOT);
  const ancestryNames = new Map<ContentId, string>(content.ancestries.map((ancestry) => [ancestry.id, ancestry.name]));
  const picked = character.ancestry;
  const pickedIds: ReadonlySet<string> = new Set(picked === undefined ? [] : [picked]);
  /** Heritages of another ancestry stay, disabled; one the character's own could take but the slot holds back (legacy) goes. */
  const offeredHeritages = content.heritages.filter(({ id, ancestry }) => {
    const theirs = ancestry !== undefined && !pickedIds.has(ancestry);
    return picked === undefined || theirs || (slot?.has(id) ?? true);
  });
  return offeredHeritages.map((heritage): HeritagePickerRow => {
    const ancestry =
      heritage.ancestry === undefined ? undefined : (ancestryNames.get(heritage.ancestry) ?? heritage.ancestry);
    const open = slot?.has(heritage.id) ?? true;
    const disabledReason = open ? undefined : unavailableReason(picked, ancestry, translate);
    return {
      id: heritage.id,
      name: heritage.name,
      ancestry,
      summary: heritage.description,
      grants: heritage.grants,
      sources: heritage.sources,
      disabledReason,
    };
  });
}

/** `skill:lore:` starts the selector of a Lore, which a background trains apart from its skill. */
const LORE_PREFIX = 'skill:lore:';

/**
 * The rows of the background picker: every background the slot offers, with the boosts, the skill and Lore it trains
 * and the feat it grants, and a note when picking it would train a skill again.
 */
export function backgroundRows(
  registry: ContentRegistry,
  character: Character,
  { translate }: OriginRowReads,
): readonly BackgroundPickerRow[] {
  const slot = offered(registry, character, BACKGROUND_SLOT);
  const skills = new Map(skillContent(registry).skills.map((skill) => [skill.selector, skill.name]));
  const options = originContent(registry).backgrounds.filter((background) => slot?.has(background.id) ?? true);
  const trainedAgain = sheetTrainedAgain(
    registry,
    character,
    BACKGROUND_SLOT,
  )(options.map((background) => background.id));
  return options.map((background): BackgroundPickerRow => {
    const again = trainedAgain.get(background.id);
    const trained = (lore: boolean): string[] =>
      background.trained
        .filter((selector) => selector.startsWith(LORE_PREFIX) === lore)
        .map((selector) => skills.get(selector) ?? selector);
    return {
      id: background.id,
      name: background.name,
      boosts: background.boosts,
      skills: trained(false),
      lores: trained(true),
      feats: background.feats,
      sources: background.sources,
      note: again === undefined ? undefined : trainedAgainNote(again, translate),
      disabledReason: undefined,
    };
  });
}
