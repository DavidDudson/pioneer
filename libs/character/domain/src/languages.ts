import { ContentId, LanguageCount, Level, Rarity, SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue, LanguageAccess } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { BoostContent } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MIN } from './character-fields';
import { ANCESTRY_SLOT } from './character-slots';
import type { AncestryLanguages, LanguageContent, LanguageOption } from './language-content';
import { levelReads } from './language-levels';
import type { LanguageFeature, LanguageReads, LevelRead } from './language-levels';
import { intelligenceAt, intelligenceRaises } from './skill-training';

const FIRST_LEVEL = Level.parse(CHARACTER_LEVEL_MIN);

/** Where a known language comes from: the ancestry, a feature's `Language` element, or a pick. */
export const LanguageSource = { Ancestry: 'ancestry', Feature: 'feature', Pick: 'pick' } as const;
export type LanguageSource = ValueOf<typeof LanguageSource>;

/** Why a language pick counts for nothing, when it names a language the content has. */
export const LanguagePickProblem = {
  /** The character knows it already, from a grant or an earlier pick. */
  Known: 'known',
  /** Rarer than the slot offers, and not on the ancestry's list. */
  Rare: 'rare',
} as const;
export type LanguagePickProblem = ValueOf<typeof LanguagePickProblem>;

/**
 * One language slot read in order: what it offers after the languages known at its level and the slots before it,
 * and its pick when it offers it. `feature` is the entry whose `Language` element opened it; none for the ancestry's
 * slots and the Intelligence modifier's.
 */
export interface LanguageSlot {
  readonly key: SlotKey;
  readonly level: Level;
  readonly feature: LanguageFeature | undefined;
  readonly options: readonly LanguageOption[];
  readonly stored: ChoiceValue | undefined;
  /** Undefined while the slot is empty, or holds something it doesn't offer. */
  readonly pick: LanguageOption | undefined;
  /** Why a stored pick naming a loaded language isn't on offer. */
  readonly problem: LanguagePickProblem | undefined;
  /** The languages known at its level before it: granted there, or picked in an earlier slot. */
  readonly known: ReadonlySet<ContentId>;
}

/** A language the character knows at its level, and where it comes from. */
export interface KnownLanguage {
  readonly language: LanguageOption;
  readonly source: LanguageSource;
  /** The ancestry or feature that granted it; none for a pick. */
  readonly from: LanguageFeature | undefined;
  /** The slot a pick fills; none for a granted language. */
  readonly slot: SlotKey | undefined;
}

/** A language slot before it is read: its key, level, the feature that opened it and the rarest it offers. */
interface LanguageSlotPlace {
  readonly key: SlotKey;
  readonly level: Level;
  readonly feature: LanguageFeature | undefined;
  readonly access: LanguageAccess;
}

/** The rarer a language, the later in this order; a slot offers those up to its access. */
const RARITIES: readonly Rarity[] = [Rarity.Common, Rarity.Uncommon, Rarity.Rare, Rarity.Unique];

/** The ancestry's slots and the Intelligence modifier's offer common languages and the ancestry's list. */
const BASE_ACCESS: LanguageAccess = Rarity.Common;

/** The languages of the ancestry picked; none before one is. */
function ancestryLanguages(document: CharacterDocument, content: LanguageContent): AncestryLanguages | undefined {
  const picked = ContentId.safeParse(document.build.choices[ANCESTRY_SLOT]);
  return picked.success ? content.ancestry(picked.data) : undefined;
}

function baseSlots(level: Level, count: LanguageCount): LanguageSlotPlace[] {
  return Array.from({ length: count }, (_unused, index) => ({
    key: SlotKey.parse(`language:${level}:${index}`),
    level,
    feature: undefined,
    access: BASE_ACCESS,
  }));
}

/**
 * The ancestry's language slots at 1st level, its count and the Intelligence modifier if positive, and one more for each
 * point a boost raises a positive Intelligence modifier past the highest it was; none before an ancestry is picked.
 */
function ancestrySlots(
  document: CharacterDocument,
  content: LanguageContent,
  boosts: BoostContent,
): LanguageSlotPlace[] {
  const languages = ancestryLanguages(document, content);
  if (languages === undefined) {
    return [];
  }
  let counted = Math.max(intelligenceAt(document, boosts, FIRST_LEVEL), 0);
  const places = baseSlots(FIRST_LEVEL, LanguageCount.parse(languages.count + counted));
  for (const { level } of intelligenceRaises(document, boosts)) {
    const positive = Math.max(intelligenceAt(document, boosts, level), 0);
    if (positive > counted) {
      places.push(...baseSlots(level, LanguageCount.parse(positive - counted)));
      counted = positive;
    }
  }
  return places;
}

/** Each `Language` element's slots, at the lowest level the character has its entry and its predicate holds. */
function featureSlots(read: readonly LevelRead[]): LanguageSlotPlace[] {
  const seen = new Set<SlotKey>();
  return read.flatMap(({ level, elements, holds }) =>
    elements.flatMap(({ feature, rule, element }): LanguageSlotPlace[] => {
      const key = SlotKey.parse(`language:${feature.entry}:${rule}`);
      if (element.slots === undefined || seen.has(key) || !holds(element.predicate)) {
        return [];
      }
      seen.add(key);
      return Array.from({ length: element.slots }, (_unused, index) => ({
        key: SlotKey.parse(`${key}:${index}`),
        level,
        feature,
        access: element.access ?? BASE_ACCESS,
      }));
    }),
  );
}

/** The languages the ancestry and the `Language` elements grant at one level, each once, the ancestry's first. */
function grantedAt(document: CharacterDocument, content: LanguageContent, read: LevelRead): KnownLanguage[] {
  const ancestry = ancestryLanguages(document, content);
  const known = new Map<ContentId, KnownLanguage>();
  const add = (id: ContentId, source: LanguageSource, from: LanguageFeature | undefined): void => {
    const language = content.language(id);
    if (language !== undefined && !known.has(language.id)) {
      known.set(language.id, { language, source, from, slot: undefined });
    }
  };
  if (ancestry !== undefined) {
    for (const id of ancestry.granted) {
      add(id, LanguageSource.Ancestry, { entry: ancestry.id, name: ancestry.name });
    }
  }
  for (const { element, feature } of read.elements) {
    if (read.holds(element.predicate)) {
      for (const id of element.grant ?? []) {
        add(id, LanguageSource.Feature, feature);
      }
    }
  }
  return [...known.values()];
}

/** Whether a slot of `access` offers `language`: no rarer than its access, or on the ancestry's list. */
function accessible(
  language: LanguageOption,
  access: LanguageAccess,
  ancestryOptions: ReadonlySet<ContentId>,
): boolean {
  return ancestryOptions.has(language.id) || RARITIES.indexOf(language.rarity) <= RARITIES.indexOf(access);
}

/** Why a loaded language a slot doesn't offer counts for nothing: known already, or too rare for it. */
export function problemOf(language: LanguageOption, known: ReadonlySet<ContentId>): LanguagePickProblem {
  return known.has(language.id) ? LanguagePickProblem.Known : LanguagePickProblem.Rare;
}

/**
 * `slots` read over what features grant at the character's level too: none offers those languages, and a pick of one
 * reads as known already. A language picked at 1st level and granted at 5th by a feat taken since counts for nothing
 * until the slot is picked again.
 */
function withoutGrantedPicks(slots: readonly LanguageSlot[], granted: readonly KnownLanguage[]): LanguageSlot[] {
  const ids = new Set(granted.map(({ language }) => language.id));
  return slots.map((slot) => {
    const options = slot.options.filter((language) => !ids.has(language.id));
    const known = new Set([...slot.known, ...ids]);
    const granting = slot.pick !== undefined && ids.has(slot.pick.id);
    return granting
      ? { ...slot, options, known, pick: undefined, problem: LanguagePickProblem.Known }
      : { ...slot, options, known };
  });
}

/**
 * `slots` with each one offering none of the languages other slots' picks hold, later ones included, and knowing them:
 * clearing an earlier slot never offers a language a later slot already picked.
 */
function withoutOtherPicks(slots: readonly LanguageSlot[]): LanguageSlot[] {
  return slots.map((slot) => {
    const others = new Set(
      slots.flatMap((other) => (other.key !== slot.key && other.pick !== undefined ? [other.pick.id] : [])),
    );
    return {
      ...slot,
      options: slot.options.filter((language) => !others.has(language.id)),
      known: new Set([...slot.known, ...others]),
    };
  });
}

/** Everything language slots and the known list are read from, worked out once per read. */
interface LanguageRead {
  readonly slots: readonly LanguageSlot[];
  readonly granted: (level: Level) => readonly KnownLanguage[];
}

function readLanguages(document: CharacterDocument, reads: LanguageReads): LanguageRead {
  const { languages: content } = reads;
  const byLevel = levelReads(document, reads);
  const granted = new Map(byLevel.map((read) => [read.level, grantedAt(document, content, read)]));
  const grantedOf = (level: Level): readonly KnownLanguage[] => granted.get(level) ?? [];
  const ancestryOptions = new Set(ancestryLanguages(document, content)?.options);
  const places = [...ancestrySlots(document, content, reads.skills.boosts), ...featureSlots(byLevel)].toSorted(
    (left, right) => left.level - right.level,
  );
  const picked = new Set<ContentId>();
  const slots = places.map(({ key, level, feature, access }): LanguageSlot => {
    const known = new Set([...grantedOf(level).map(({ language }) => language.id), ...picked]);
    const options = content.languages.filter(
      (language) => !known.has(language.id) && accessible(language, access, ancestryOptions),
    );
    const stored = document.build.choices[key];
    const named = stored === undefined ? undefined : content.language(stored);
    const pick = options.find((language) => language.id === named?.id);
    if (pick !== undefined) {
      picked.add(pick.id);
    }
    const problem = named === undefined || pick !== undefined ? undefined : problemOf(named, known);
    return { key, level, feature, options, stored, pick, problem, known };
  });
  const read = withoutGrantedPicks(slots, grantedOf(Level.parse(document.level)));
  return { slots: withoutOtherPicks(read), granted: grantedOf };
}

/**
 * Every language slot up to 20th level, by level, the ancestry's first: once an ancestry is picked, its count and the
 * Intelligence modifier at 1st level, one more per point a boost raises Intelligence past what it was, and the slots
 * of each `Language` element from the lowest level its entry is on the character and its predicate holds. Each is
 * read over the languages known at its level and the picks before it, so a pick of a language known already, or one
 * rarer than the slot offers, counts for nothing until it is changed.
 */
export function languageSlots(document: CharacterDocument, reads: LanguageReads): readonly LanguageSlot[] {
  return readLanguages(document, reads).slots;
}

/**
 * The languages the character knows at its level: the ancestry's, those its features' `Language` elements grant, and
 * its picks in the slots it has there, in that order.
 */
export function knownLanguages(document: CharacterDocument, reads: LanguageReads): readonly KnownLanguage[] {
  return languagesOf(document, reads).known;
}

/** A character's language slots and the languages it knows, read once. */
export interface CharacterLanguageRead {
  readonly slots: readonly LanguageSlot[];
  readonly known: readonly KnownLanguage[];
}

/** `languageSlots` and `knownLanguages` together, from one read. */
export function languagesOf(document: CharacterDocument, reads: LanguageReads): CharacterLanguageRead {
  const level = Level.parse(document.level);
  const { slots, granted } = readLanguages(document, reads);
  const picks = slots.flatMap((slot): KnownLanguage[] =>
    slot.level <= level && slot.pick !== undefined
      ? [{ language: slot.pick, source: LanguageSource.Pick, from: undefined, slot: slot.key }]
      : [],
  );
  return { slots, known: [...granted(level), ...picks] };
}

/**
 * How many languages `slots` lets the character still add at `level`: its slots up to that level with no pick that
 * counts, empty or invalid.
 */
export function openLanguageSlots(slots: readonly LanguageSlot[], level: Level): LanguageCount {
  return LanguageCount.parse(slots.filter((slot) => slot.level <= level && slot.pick === undefined).length);
}
