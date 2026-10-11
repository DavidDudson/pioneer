import type { GrantResolution } from '@pioneer/rules/grants';
import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import { Attribute, ContentId, Level, Proficiency, RuleElementKey, SkillCount, SlotKey } from '@pioneer/rules/sdk';
import type { AttributeModifier, ChoiceValue, Selector } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { attributeModifiers, boostSets } from './attribute-boosts';
import type { BoostContent } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MIN } from './character-fields';
import { CLASS_SLOT } from './character-slots';
import { SKILL_PREFIX } from './skill-content';
import type { SkillContent, SkillOption } from './skill-content';

const FIRST_LEVEL = Level.parse(CHARACTER_LEVEL_MIN);

/** Whether a skill slot trains a new skill or raises one a rank. */
export const SkillSlotKind = { Training: 'training', Increase: 'increase' } as const;
export type SkillSlotKind = ValueOf<typeof SkillSlotKind>;

/** Why a skill pick counts for nothing, when it names a skill the content has. */
export const SkillPickProblem = {
  /** A trained skill slot's pick the character is trained in already. */
  Trained: 'trained',
  /** A skill increase past the rank its level allows. */
  Capped: 'capped',
} as const;
export type SkillPickProblem = ValueOf<typeof SkillPickProblem>;

/**
 * One skill slot read in order: what it offers after the grants and the slots before it, its pick when it offers it,
 * and the rank the pick reaches.
 */
export interface SkillSlot {
  readonly key: SlotKey;
  readonly level: Level;
  readonly kind: SkillSlotKind;
  readonly options: readonly SkillOption[];
  readonly stored: ChoiceValue | undefined;
  /** Undefined while the slot is empty, or holds something it doesn't offer. */
  readonly pick: SkillOption | undefined;
  readonly rank: Proficiency | undefined;
  /** Why a stored pick naming a loaded skill isn't on offer. */
  readonly problem: SkillPickProblem | undefined;
}

/** The character's grants at a level, over every pick it holds. */
export type GrantsAt = (level: Level) => GrantResolution;

const RANKS: readonly Proficiency[] = Object.values(Proficiency);
const MASTER_FROM = Level.parse(7);
const LEGENDARY_FROM = Level.parse(15);
/** The lowest level a skill increase may raise to each rank (Player Core): master from 7th, legendary from 15th. */
const RANK_FROM: Readonly<Record<Proficiency, Level>> = {
  [Proficiency.Untrained]: FIRST_LEVEL,
  [Proficiency.Trained]: FIRST_LEVEL,
  [Proficiency.Expert]: FIRST_LEVEL,
  [Proficiency.Master]: MASTER_FROM,
  [Proficiency.Legendary]: LEGENDARY_FROM,
};

function higher(left: Proficiency | undefined, right: Proficiency | undefined): Proficiency | undefined {
  return RANKS.indexOf(right ?? Proficiency.Untrained) > RANKS.indexOf(left ?? Proficiency.Untrained) ? right : left;
}

/** The rank a skill increase at `level` raises `rank` to; undefined past legendary or past what the level allows. */
export function increasedRank(rank: Proficiency | undefined, level: Level): Proficiency | undefined {
  const next = RANKS[RANKS.indexOf(rank ?? Proficiency.Untrained) + 1];
  return next !== undefined && RANK_FROM[next] <= level ? next : undefined;
}

/** A skill rank one entry of the effective set raises, by a `Proficiency` element whose predicate holds. */
interface SkillRaise {
  readonly entry: ContentId;
  readonly selector: Selector;
  readonly rank: Proficiency;
}

function skillRaises({ items, facts }: GrantResolution): SkillRaise[] {
  return items.flatMap(({ entry }) =>
    entry.rules.flatMap((element): SkillRaise[] => {
      if (element.key !== RuleElementKey.Proficiency || !element.selector.startsWith(SKILL_PREFIX)) {
        return [];
      }
      const holds = element.predicate === undefined || evaluatePredicate(element.predicate, facts) === Truth.True;
      return holds ? [{ entry: entry.id, selector: element.selector, rank: element.rank }] : [];
    }),
  );
}

/** The skill ranks the effective set raises: the highest raise of each skill. */
function grantedSkillRanks(resolution: GrantResolution): ReadonlyMap<Selector, Proficiency> {
  const ranks = new Map<Selector, Proficiency>();
  for (const { selector, rank } of skillRaises(resolution)) {
    ranks.set(selector, higher(ranks.get(selector), rank) ?? rank);
  }
  return ranks;
}

/**
 * How many skills the grants train twice at 1st level: an entry training a skill another already trains trains
 * another skill instead, the player's choice (Player Core), so each adds a trained skill slot.
 */
function duplicateTrainings(resolution: GrantResolution): SkillCount {
  const trainers = Map.groupBy(
    skillRaises(resolution).filter(({ rank }) => rank === Proficiency.Trained),
    ({ selector }) => selector,
  );
  const twice = [...trainers.values()].map((raises) => new Set(raises.map(({ entry }) => entry)).size - 1);
  return SkillCount.parse(twice.reduce((total, count) => total + count, 0));
}

/** A skill slot before it is read: its key, level and kind. */
interface SkillSlotPlace {
  readonly key: SlotKey;
  readonly level: Level;
  readonly kind: SkillSlotKind;
}

function trainingSlots(level: Level, count: SkillCount): SkillSlotPlace[] {
  return Array.from({ length: count }, (_unused, index) => ({
    key: SlotKey.parse(`skill-training:${level}:${index}`),
    level,
    kind: SkillSlotKind.Training,
  }));
}

function intelligenceAt(document: CharacterDocument, boosts: BoostContent, level: Level): AttributeModifier {
  return attributeModifiers({ ...document, level }, boosts).get(Attribute.Intelligence);
}

/** The trained skills a boost raising Intelligence past what it was adds after 1st level, one per point. */
function intelligenceTrainings(document: CharacterDocument, boosts: BoostContent): SkillSlotPlace[] {
  let highest = intelligenceAt(document, boosts, FIRST_LEVEL);
  const places: SkillSlotPlace[] = [];
  // Intelligence changes only where boosts are given, so it is read at those levels alone.
  const levels = new Set(boostSets(document, boosts).map((set) => set.level));
  for (const level of [...levels].filter((each) => each > FIRST_LEVEL)) {
    const intelligence = intelligenceAt(document, boosts, level);
    if (intelligence > highest) {
      places.push(...trainingSlots(level, SkillCount.parse(intelligence - highest)));
      highest = intelligence;
    }
  }
  return places;
}

/**
 * The character's skill slots up to 20th level, in the order they are read, by level and trained skills first: once a
 * class is picked, its trained skills at 1st level (its count, the Intelligence modifier, and one for each skill its
 * grants train twice), one more for each point a boost raises Intelligence past what it was, and a skill increase at
 * each of the class's levels.
 */
function skillSlotPlaces(document: CharacterDocument, { skills, boosts, grantsAt }: SkillReads): SkillSlotPlace[] {
  const picked = ContentId.safeParse(document.build.choices[CLASS_SLOT]);
  const classSkills = picked.success ? skills.classSkills(picked.data) : undefined;
  if (classSkills === undefined) {
    return [];
  }
  const intelligence = intelligenceAt(document, boosts, FIRST_LEVEL);
  const first = classSkills.additional + intelligence + duplicateTrainings(grantsAt(FIRST_LEVEL));
  const increases = classSkills.increaseLevels.map((level) => ({
    key: SlotKey.parse(`skill-increase:${level}`),
    level,
    kind: SkillSlotKind.Increase,
  }));
  const trainings = [
    ...trainingSlots(FIRST_LEVEL, SkillCount.parse(Math.max(first, 0))),
    ...intelligenceTrainings(document, boosts),
  ];
  return [...trainings, ...increases].toSorted((left, right) => left.level - right.level);
}

/** The rank one slot's pick would reach, over the ranks so far; undefined when the slot can't take it. */
function rankFor(kind: SkillSlotKind, level: Level, rank: Proficiency | undefined): Proficiency | undefined {
  if (kind === SkillSlotKind.Training) {
    return rank === undefined || rank === Proficiency.Untrained ? Proficiency.Trained : undefined;
  }
  return increasedRank(rank, level);
}

/** What a skill slot is read with: the skills and boosts content, and the grants at each level. */
export interface SkillReads {
  readonly skills: SkillContent;
  readonly boosts: BoostContent;
  readonly grantsAt: GrantsAt;
}

/**
 * Every skill slot up to 20th level, each read over the grants at its level and the picks of the slots before it, so
 * a pick of a skill already trained, or an increase past the rank its level allows, offers nothing and counts for
 * nothing until it is changed.
 */
export function skillSlots(document: CharacterDocument, reads: SkillReads): readonly SkillSlot[] {
  const picked = new Map<Selector, Proficiency>();
  const granted = new Map<Level, ReadonlyMap<Selector, Proficiency>>();
  const grantedAt = (level: Level): ReadonlyMap<Selector, Proficiency> => {
    const known = granted.get(level) ?? grantedSkillRanks(reads.grantsAt(level));
    granted.set(level, known);
    return known;
  };
  return skillSlotPlaces(document, reads).map(({ key, level, kind }): SkillSlot => {
    const ranks = grantedAt(level);
    const rankOf = (selector: Selector): Proficiency | undefined => higher(ranks.get(selector), picked.get(selector));
    const options = reads.skills.skills.filter((skill) => rankFor(kind, level, rankOf(skill.selector)) !== undefined);
    const stored = document.build.choices[key];
    const named = stored === undefined ? undefined : reads.skills.skill(stored);
    const pick = options.find((skill) => skill.id === named?.id);
    const rank = pick === undefined ? undefined : rankFor(kind, level, rankOf(pick.selector));
    if (pick !== undefined && rank !== undefined) {
      picked.set(pick.selector, rank);
    }
    const capped = kind === SkillSlotKind.Training ? SkillPickProblem.Trained : SkillPickProblem.Capped;
    const problem = named !== undefined && pick === undefined ? capped : undefined;
    return { key, level, kind, options, stored, pick, rank, problem };
  });
}

/**
 * The skill ranks the character's picks reach at its level: each trained skill and skill increase up to it, in order.
 * The plan above its level doesn't count yet.
 */
export function pickedSkillRanks(document: CharacterDocument, reads: SkillReads): ReadonlyMap<Selector, Proficiency> {
  const ranks = new Map<Selector, Proficiency>();
  for (const slot of skillSlots(document, reads)) {
    if (slot.level <= document.level && slot.pick !== undefined && slot.rank !== undefined) {
      ranks.set(slot.pick.selector, slot.rank);
    }
  }
  return ranks;
}

/** `ranks` with the skill ranks the picks reach, the higher of the two for each skill. */
export function withSkillPicks(
  ranks: ReadonlyMap<Selector, Proficiency>,
  picks: ReadonlyMap<Selector, Proficiency>,
): ReadonlyMap<Selector, Proficiency> {
  const merged = new Map(ranks);
  for (const [selector, rank] of picks) {
    merged.set(selector, higher(merged.get(selector), rank) ?? rank);
  }
  return merged;
}
