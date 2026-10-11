import { BookId, ContentId, contentId, ContentKind, EntrySlug, entrySlug, PackId, Slug } from '@pioneer/rules/sdk';

import type { KnownEntry } from '../entry-references';
import { foundryConfig } from '../foundry-config';
import type { FoundryConfig } from '../foundry-config';
import { FoundryDocument, isFoundryItemType } from '../foundry-document';
import type { FoundryLang, FoundryPack } from '../foundry-release';
import type { SelectedEntry } from '../select-entries';
import { translateImport } from '../translate-import';
import type { ImportContext, ImportTranslation } from '../translate-import';

/** Fixture Foundry documents, config and lang table for the import's tests, shaped as `pf2e-8.6.0` has them. */

export const playerCore = BookId.parse('player-core');
const pack = PackId.parse('player-core');
export const coreRules = PackId.parse('core-rules');

const remaster = { title: 'Pathfinder Player Core', license: 'ORC', remaster: true };

/** Foundry's pack for each type the fixtures use, by compendium name and source directory. */
const PACKS: Readonly<Record<string, FoundryPack>> = {
  action: { name: 'actionspf2e', directory: 'actions' },
  ancestry: { name: 'ancestries', directory: 'ancestries' },
  condition: { name: 'conditionitems', directory: 'conditions' },
  effect: { name: 'equipment-effects', directory: 'equipment-effects' },
  feat: { name: 'feats-srd', directory: 'feats' },
  heritage: { name: 'heritages', directory: 'heritages' },
};

export interface DocumentFixture {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system?: object;
}

function selected({ id, name, type, system = {} }: DocumentFixture): SelectedEntry {
  if (!isFoundryItemType(type)) {
    throw new Error(`${type} is not a Foundry item type`);
  }
  const foundryPack = PACKS[type] ?? { name: `${type}-srd`, directory: type };
  return {
    pack: foundryPack,
    path: `packs/pf2e/${foundryPack.directory}/${id}.json`,
    document: FoundryDocument.parse({ _id: id, name, type, system: { publication: remaster, ...system } }),
    type,
    book: playerCore,
  };
}

const LABELS = {
  manipulate: 'PF2E.TraitManipulate',
  move: 'PF2E.TraitMove',
  fire: 'PF2E.TraitFire',
  dwarf: 'PF2E.TraitDwarf',
  humanoid: 'PF2E.TraitHumanoid',
};

export const config: FoundryConfig = foundryConfig({
  traits: {
    actionTraits: { manipulate: LABELS.manipulate, move: LABELS.move, fire: LABELS.fire },
    armorTraits: {},
    classTraits: {},
    consumableTraits: { fire: LABELS.fire },
    creatureTraits: { dwarf: LABELS.dwarf, humanoid: LABELS.humanoid },
    effectTraits: {},
    equipmentTraits: {},
    featTraits: { dwarf: LABELS.dwarf, manipulate: LABELS.manipulate },
    shieldTraits: {},
    spellTraits: { fire: LABELS.fire, manipulate: LABELS.manipulate },
    weaponTraits: {},
  },
  creature: {
    LANGUAGES_BY_RARITY: {
      pf2e: { common: ['dwarven'], uncommon: ['petran'], rare: ['aklo'], secret: ['wildsong'] },
      sf2e: { common: [], uncommon: [], rare: [], secret: [] },
    },
    SENSE_TYPES: new Set(['darkvision', 'scent', 'low-light-vision']),
    SENSES_WITH_MANDATORY_ACUITIES: { darkvision: 'precise', 'low-light-vision': 'precise' },
    SENSES_WITH_UNLIMITED_RANGE: ['darkvision', 'low-light-vision'],
  },
  damage: { DAMAGE_TYPES: new Set(['bludgeoning', 'fire', 'untyped']) },
});

export const lang: FoundryLang = {
  PF2E: {
    TraitManipulate: 'Manipulate',
    TraitMove: 'Move',
    TraitFire: 'Fire',
    TraitDwarf: 'Dwarf',
    TraitHumanoid: 'Humanoid',
    TraitBludgeoning: 'Bludgeoning',
    Actor: {
      Creature: {
        Language: { dwarven: 'Dwarven', petran: 'Petran', aklo: 'Aklo', wildsong: 'Wildsong' },
        Sense: { Type: { Darkvision: 'Darkvision', Scent: 'Scent', LowLightVision: 'Low-Light Vision' } },
      },
    },
  },
};

/** A hand-authored `core-rules` entry of `kind` named `name`. */
export function coreRulesEntry(kind: ContentKind, name: string): KnownEntry {
  const parsed = entrySlug(kind, Slug.parse(name));
  return { id: ContentId.parse(contentId(coreRules, parsed)), pack: coreRules, kind, slug: parsed };
}

/** `core-rules` as committed: Common and Dwarven, and darkvision. */
export const known: readonly KnownEntry[] = [
  coreRulesEntry(ContentKind.Language, 'common'),
  coreRulesEntry(ContentKind.Language, 'dwarven'),
  coreRulesEntry(ContentKind.Sense, 'darkvision'),
];

const context: ImportContext = { pack, vocabularyPack: coreRules, books: [playerCore], config, lang, known };

export function translate(
  documents: readonly DocumentFixture[],
  overrides: Partial<ImportContext> = {},
): ImportTranslation {
  return translateImport(
    documents.map((each) => selected(each)),
    { ...context, ...overrides },
  );
}

/** The id of the player-core entry with a slug (`condition:grabbed`). */
export function idOf(slug: string): ContentId {
  return ContentId.parse(contentId(pack, EntrySlug.parse(slug)));
}

/** The id of the core-rules entry with a slug (`trait:manipulate`). */
export function coreRulesId(slug: string): ContentId {
  return ContentId.parse(contentId(coreRules, EntrySlug.parse(slug)));
}
