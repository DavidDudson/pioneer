import type { GrantResolution } from '@pioneer/rules/grants';
import { Attribute, ContentId, Level, Proficiency, SkillCount, SlotKey } from '@pioneer/rules/sdk';
import type { AttributeModifier, ChoiceValue, Selector } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { attributeModifiers, boostSets } from './attribute-boosts';
import type { BoostContent } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MIN } from './character-fields';
import { CLASS_SLOT } from './character-slots';
import type { SkillContent, SkillOption } from './skill-content';
import { duplicateTrainings, grantedSkillRanks, higher, RANKS, trainingEntries } from './skill-raises';
import { trainedSkills } from './skill-trained';
import type { TrainedSkill } from './skill-trained';

export { grantedSkillRanks } from './skill-raises';

const FIRST_LEVEL = Level.parse(CHARACTER_LEVEL_MIN);

/** Whether a skill slot trains a new skill or raises one a rank. */
export const SkillSlotKind = {
  Training: 'training',
  Increase: 'increase',
} as const;
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
  /** For a trained skill slot, the skills it can't offer because the character is trained already, with their sources. */
  readonly trained: readonly TrainedSkill[];
}

/** A value read once for each level it is asked at. */
function byLevel<TValue>(read: (level: Level) => TValue): (level: Level) => TValue {
  const known = new Map<Level, TValue>();
  return (level) => {
    const value = known.get(level) ?? read(level);
    known.set(level, value);
    return value;
  };
}

/** The character's grants at a level, over every pick it holds. */
export type GrantsAt = (level: Level) => GrantResolution;

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

/** The rank a skill increase at `level` raises `rank` to; undefined past legendary or past what the level allows. */
export function increasedRank(rank: Proficiency | undefined, level: Level): Proficiency | undefined {
  const next = RANKS[RANKS.indexOf(rank ?? Proficiency.Untrained) + 1];
  return next !== undefined && RANK_FROM[next] <= level ? next : undefined;
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

export function intelligenceAt(document: CharacterDocument, boosts: BoostContent, level: Level): AttributeModifier {
  return attributeModifiers({ ...document, level }, boosts).get(Attribute.Intelligence);
}

/** A boost raising Intelligence past what it was after 1st level: where, and by how many points. */
export interface IntelligenceRaise {
  readonly level: Level;
  readonly points: SkillCount;
}

/**
 * Each boost after 1st level that raises Intelligence past the highest it was, which adds a trained skill and a language
 * per point (Player Core).
 */
export function intelligenceRaises(document: CharacterDocument, boosts: BoostContent): readonly IntelligenceRaise[] {
  let highest = intelligenceAt(document, boosts, FIRST_LEVEL);
  const raises: IntelligenceRaise[] = [];
  // Intelligence changes only where boosts are given, so it is read at those levels alone.
  const levels = new Set(boostSets(document, boosts).map((set) => set.level));
  for (const level of [...levels].filter((each) => each > FIRST_LEVEL)) {
    const intelligence = intelligenceAt(document, boosts, level);
    if (intelligence > highest) {
      raises.push({ level, points: SkillCount.parse(intelligence - highest) });
      highest = intelligence;
    }
  }
  return raises;
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
    ...intelligenceRaises(document, boosts).flatMap(({ level, points }) => trainingSlots(level, points)),
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

/** What a slot's stored pick comes to: the skill it offers, the rank that reaches, or why it counts for nothing. */
interface PickRead {
  readonly pick: SkillOption | undefined;
  readonly rank: Proficiency | undefined;
  readonly problem: SkillPickProblem | undefined;
}

/** A slot's stored pick, what it offers, and the problem to report when it isn't among them. */
interface PickSource {
  readonly stored: ChoiceValue | undefined;
  readonly options: readonly SkillOption[];
  readonly refusal: SkillPickProblem;
}

function readPick(
  skills: SkillContent,
  { stored, options, refusal }: PickSource,
  rankOf: (skill: SkillOption) => Proficiency | undefined,
): PickRead {
  const named = stored === undefined ? undefined : skills.skill(stored);
  const pick = options.find((skill) => skill.id === named?.id);
  const rank = pick === undefined ? undefined : rankOf(pick);
  const problem = named !== undefined && pick === undefined ? refusal : undefined;
  return { pick, rank, problem };
}

/**
 * Every skill slot up to 20th level, each read over the grants at its level and the picks of the slots before it, so
 * a pick of a skill already trained, or an increase past the rank its level allows, offers nothing and counts for
 * nothing until it is changed.
 */
export function skillSlots(document: CharacterDocument, reads: SkillReads): readonly SkillSlot[] {
  const picked = new Map<Selector, Proficiency>();
  const pickedBy = new Map<Selector, readonly SlotKey[]>();
  const grantedAt = byLevel((level) => grantedSkillRanks(reads.grantsAt(level)));
  const entriesAt = byLevel((level) => trainingEntries(reads.grantsAt(level)));
  return skillSlotPlaces(document, reads).map(({ key, level, kind }): SkillSlot => {
    const ranks = grantedAt(level);
    const rankOf = (selector: Selector): Proficiency | undefined => higher(ranks.get(selector), picked.get(selector));
    const refusal = kind === SkillSlotKind.Training ? SkillPickProblem.Trained : SkillPickProblem.Capped;
    const open = (skill: SkillOption): boolean => rankFor(kind, level, rankOf(skill.selector)) !== undefined;
    const options = reads.skills.skills.filter(open);
    const trained =
      kind === SkillSlotKind.Training
        ? trainedSkills(reads.skills.skills, (skill) => !open(skill), {
            entries: entriesAt(level),
            slots: pickedBy,
          })
        : [];
    const stored = document.build.choices[key];
    const { pick, rank, problem } = readPick(reads.skills, { stored, options, refusal }, (skill) =>
      rankFor(kind, level, rankOf(skill.selector)),
    );
    if (pick !== undefined && rank !== undefined) {
      picked.set(pick.selector, rank);
      pickedBy.set(pick.selector, [...(pickedBy.get(pick.selector) ?? []), key]);
    }
    return {
      key,
      level,
      kind,
      options,
      stored,
      pick,
      rank,
      problem,
      trained,
    };
  });
}

/** The skill ranks `slots`' picks reach at `level`: each trained skill and skill increase up to it, in order. */
export function slotSkillRanks(slots: readonly SkillSlot[], level: Level): ReadonlyMap<Selector, Proficiency> {
  const ranks = new Map<Selector, Proficiency>();
  for (const slot of slots) {
    if (slot.level <= level && slot.pick !== undefined && slot.rank !== undefined) {
      ranks.set(slot.pick.selector, slot.rank);
    }
  }
  return ranks;
}

/**
 * The skill ranks the character's picks reach at its level: each trained skill and skill increase up to it, in order.
 * The plan above its level doesn't count yet.
 */
export function pickedSkillRanks(document: CharacterDocument, reads: SkillReads): ReadonlyMap<Selector, Proficiency> {
  return slotSkillRanks(skillSlots(document, reads), Level.parse(document.level));
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
