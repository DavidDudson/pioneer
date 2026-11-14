import type { SpellcastingInPlay, SpellSlots } from '@pioneer/rules/engine';
import type { GrantResolution } from '@pioneer/rules/grants';
import { Level, Proficiency, SlotCount, SlotKey, SlotRank } from '@pioneer/rules/sdk';
import type { ContentId, ContentText, Selector, SpellRank } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { ChoiceSourceKind, sourceOfKind } from './choice-source';
import type { ChoiceSource } from './choice-source';
import { characterRanks, classFeatures } from './class-build';
import { cantripRank } from './prepared-spells';
import type { PreparedRank } from './prepared-spells';
import { resolveSlotsAt, slotContextOf } from './slot-reads';
import type { SlotContent } from './slot-reads';
import { characterSpellcasting } from './spellcasting-build';

/** What a level changes without asking: a rank rises, a class feature arrives, cantrips heighten, slots grow (#1683). */
export const AutomaticKind = {
  ProficiencyRise: 'proficiency-rise',
  ClassFeature: 'class-feature',
  CantripHeightening: 'cantrip-heightening',
  SpellSlots: 'spell-slots',
} as const;
export type AutomaticKind = ValueOf<typeof AutomaticKind>;

interface AutomaticBase {
  readonly source: ChoiceSource;
}

/** A statistic's proficiency rank rises, Trained to Expert. */
interface ProficiencyRise extends AutomaticBase {
  readonly kind: typeof AutomaticKind.ProficiencyRise;
  readonly selector: Selector;
  readonly from: Proficiency;
  readonly to: Proficiency;
}

/** A feature the class gives at the level, fixed, with nothing to pick. */
interface ClassFeatureGain extends AutomaticBase {
  readonly kind: typeof AutomaticKind.ClassFeature;
  readonly id: ContentId;
  readonly name: ContentText;
}

/** The character's cantrips cast at a higher rank from this level. */
interface CantripHeightening extends AutomaticBase {
  readonly kind: typeof AutomaticKind.CantripHeightening;
  readonly rank: SpellRank;
}

/** The character gains `count` more slots, or cantrips, of `rank`. */
interface SpellSlotGain extends AutomaticBase {
  readonly kind: typeof AutomaticKind.SpellSlots;
  readonly rank: PreparedRank;
  readonly count: SlotCount;
}

/** One automatic improvement of a level: read-only, with the source it comes from. */
export type AutomaticChange = ProficiencyRise | ClassFeatureGain | CantripHeightening | SpellSlotGain;

/** A level and the automatic improvements it makes. */
export interface AutomaticRow {
  readonly level: Level;
  readonly changes: readonly AutomaticChange[];
}

/** The ranks, lowest first, so a higher index is a higher rank. */
const RANK_ORDER: readonly Proficiency[] = [
  Proficiency.Untrained,
  Proficiency.Trained,
  Proficiency.Expert,
  Proficiency.Master,
  Proficiency.Legendary,
];

const FIRST_LEVEL = Level.parse(CHARACTER_LEVEL_MIN);

/** Every level from 1st to `CHARACTER_LEVEL_MAX`, lowest first. */
function allLevels(): Level[] {
  const count = CHARACTER_LEVEL_MAX - CHARACTER_LEVEL_MIN + 1;
  return Array.from({ length: count }, (_unused, index) => Level.parse(CHARACTER_LEVEL_MIN + index));
}

/** The character's grants at `level`, over every pick it holds, as the sheet reads them at its own level. */
function grantsAt(level: Level, document: CharacterDocument, content: SlotContent): GrantResolution {
  const picks = new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value]));
  return resolveSlotsAt(level, slotContextOf(document, content, picks));
}

/** Whether `to` is a higher rank than `from`; a statistic with no rank yet is untrained. */
function rises(from: Proficiency | undefined, to: Proficiency): boolean {
  return RANK_ORDER.indexOf(to) > RANK_ORDER.indexOf(from ?? Proficiency.Untrained);
}

/** One level read against the one before it: the grants at each, and what they are grants of. */
interface Moment {
  readonly level: Level;
  readonly now: GrantResolution;
  readonly before: GrantResolution;
  readonly document: CharacterDocument;
  readonly content: SlotContent;
}

/** The ranks the grants at the level raise past what they were at the one before. */
function proficiencyRises({ now, before }: Moment, source: ChoiceSource): readonly AutomaticChange[] {
  const earlier = characterRanks(before);
  return [...characterRanks(now)]
    .filter(([selector, rank]) => rises(earlier.get(selector), rank))
    .map(([selector, rank]) => ({
      kind: AutomaticKind.ProficiencyRise,
      source,
      selector,
      from: earlier.get(selector) ?? Proficiency.Untrained,
      to: rank,
    }));
}

/** The fixed class features that arrive at the level; a feature the character picked is a choice, not listed. */
function featuresAt({ level, now, document, content }: Moment, source: ChoiceSource): readonly AutomaticChange[] {
  const picked = new Set<unknown>(Object.values(document.build.choices));
  return classFeatures(now, content.lookup)
    .filter((feature) => feature.level === level && !picked.has(feature.id))
    .map((feature) => ({ kind: AutomaticKind.ClassFeature, source, id: feature.id, name: feature.name }));
}

/** How many slots of `rank` an entry's table gives; undefined for none. */
function countOf(slots: SpellSlots | undefined, rank: PreparedRank): SlotCount | undefined {
  if (rank === SlotRank.Cantrip) {
    return slots?.cantrips;
  }
  return slots?.ranks.find((each) => each.rank === rank)?.count;
}

/** The slots and cantrips an entry has that it lacked at the level before, from 2nd level on. */
function slotGains(entry: SpellcastingInPlay, prior: SpellcastingInPlay, source: ChoiceSource): AutomaticChange[] {
  const cantrips = entry.slots.cantrips === undefined ? [] : [{ rank: SlotRank.Cantrip, count: entry.slots.cantrips }];
  return [...cantrips, ...entry.slots.ranks].flatMap(({ rank, count }): AutomaticChange[] => {
    const had = countOf(prior.slots, rank) ?? 0;
    return count > had ? [{ kind: AutomaticKind.SpellSlots, source, rank, count: SlotCount.parse(count - had) }] : [];
  });
}

/** The entries the character had at the level before and still has, each with the entry it was. */
function continuing({ now, before }: Moment): readonly (readonly [SpellcastingInPlay, SpellcastingInPlay])[] {
  const earlier = characterSpellcasting(before);
  return characterSpellcasting(now).flatMap((entry) => {
    const prior = earlier.find((each) => each.slug === entry.slug);
    return prior === undefined ? [] : [[entry, prior] as const];
  });
}

/** The spell slot gains of each entry the character already had, and its cantrips heightening, at the level. */
function spellChanges(moment: Moment, source: ChoiceSource): readonly AutomaticChange[] {
  const { level } = moment;
  const heightens = cantripRank(level) > cantripRank(Level.parse(level - 1));
  const entries = continuing(moment);
  const gains = entries.flatMap(([entry, prior]) => slotGains(entry, prior, source));
  const heightenings = entries
    .filter(([entry]) => heightens && entry.slots.cantrips !== undefined)
    .map((): AutomaticChange => ({ kind: AutomaticKind.CantripHeightening, source, rank: cantripRank(level) }));
  return [...gains, ...heightenings];
}

/** What `level` changes by itself for the character: from the same grants the sheet reads, never a copy of them. */
function levelChanges(level: Level, document: CharacterDocument, content: SlotContent): readonly AutomaticChange[] {
  const now = grantsAt(level, document, content);
  const source = sourceOfKind(ChoiceSourceKind.Class, document, content);
  if (level === FIRST_LEVEL) {
    return featuresAt({ level, now, before: now, document, content }, source);
  }
  const moment = { level, now, before: grantsAt(Level.parse(level - 1), document, content), document, content };
  const casting = sourceOfKind(ChoiceSourceKind.Spellcasting, document, content);
  return [...featuresAt(moment, source), ...proficiencyRises(moment, source), ...spellChanges(moment, casting)];
}

/**
 * One row per level from 1st to 20th (#1683): the improvements it makes with nothing to pick, read from the grants at
 * that level against the level before. Level 1 lists its fixed class features only; its starting ranks and slots are
 * the build, not a rise.
 */
export function automaticTimeline(document: CharacterDocument, content: SlotContent): readonly AutomaticRow[] {
  return allLevels().map((level) => ({ level, changes: levelChanges(level, document, content) }));
}
