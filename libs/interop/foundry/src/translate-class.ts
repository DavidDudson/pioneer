import { ContentKind, Proficiency, RuleElementKey, slugName } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { addRule, ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { attributeSlots, FoundryGrantedItems, fromLevel, grantItems, systemOf } from './kind-fields';
import { FoundryTrainedSkills, trainSkills } from './translate-background';

/**
 * A class's `data` from Foundry's `class` item, and its progression as rule elements (content-model.md, "Class
 * progression"): a `Proficiency` per starting rank, a `GrantItem` per class feature from its level, and a class feat
 * slot (`ChoiceSet` and the `GrantItem` of its pick) at each class feat level. Later ranks come from the class
 * features that raise them, as in Foundry.
 */

const FIELD_MAX = 64;
const LEVELS_MAX = 20;
const RANK_MAX = 4;

/** Foundry's rank numbers, 0 (untrained) to 4 (legendary). */
const FoundryRank = z.number().int().min(0).max(RANK_MAX);

/** The rank Foundry's number names; untrained is every statistic's floor, so it raises nothing. */
const RANKS: readonly (Proficiency | undefined)[] = [
  undefined,
  Proficiency.Trained,
  Proficiency.Expert,
  Proficiency.Master,
  Proficiency.Legendary,
];

const FoundryLevel = z.number().int().min(1).max(LEVELS_MAX);
const FoundryLevels = z.looseObject({ value: z.array(FoundryLevel).max(LEVELS_MAX) });
const FoundryKeyAbility = z.array(z.string().max(FIELD_MAX)).max(LEVELS_MAX);
const FoundryOtherAttack = z.looseObject({ name: z.string().max(FIELD_MAX), rank: FoundryRank });

const FoundryClassSystem = z.looseObject({
  keyAbility: z.looseObject({ value: FoundryKeyAbility }),
  hp: z.number(),
  perception: FoundryRank,
  savingThrows: z.looseObject({ fortitude: FoundryRank, reflex: FoundryRank, will: FoundryRank }),
  attacks: z.looseObject({
    simple: FoundryRank,
    martial: FoundryRank,
    advanced: FoundryRank,
    unarmed: FoundryRank,
    other: FoundryOtherAttack.optional(),
  }),
  defenses: z.looseObject({ unarmored: FoundryRank, light: FoundryRank, medium: FoundryRank, heavy: FoundryRank }),
  trainedSkills: FoundryTrainedSkills.extend({ additional: z.number().int().min(0) }),
  spellcasting: FoundryRank.default(0),
  items: FoundryGrantedItems.default({}),
  classFeatLevels: FoundryLevels,
  ancestryFeatLevels: FoundryLevels.optional(),
  generalFeatLevels: FoundryLevels.optional(),
  skillFeatLevels: FoundryLevels.optional(),
  skillIncreaseLevels: FoundryLevels.optional(),
});
type FoundryClassSystem = z.infer<typeof FoundryClassSystem>;

/** First levels and spacing of Player Core's shared slots: ancestry feats at 1, 5, 9…; skill feats at 2, 4, 6…. */
const ANCESTRY_FEAT_FIRST = 1;
const GENERAL_FEAT_FIRST = 3;
const SKILL_FEAT_FIRST = 2;
const SKILL_INCREASE_FIRST = 3;
const FEAT_STEP = 4;
const SKILL_STEP = 2;

/** `first`, then every `step` levels up to 20th. */
function everyLevel(first: number, step: number): readonly number[] {
  return Array.from({ length: Math.floor((LEVELS_MAX - first) / step) + 1 }, (_value, at) => first + at * step);
}

/**
 * Player Core's level schedule for the slots every class shares. The builder opens these itself (character-model.md,
 * "Choice slots"), so a class on the schedule needs nothing more; one that differs is reported, never dropped.
 */
const SHARED_SLOT_LEVELS = {
  ancestryFeatLevels: everyLevel(ANCESTRY_FEAT_FIRST, FEAT_STEP),
  generalFeatLevels: everyLevel(GENERAL_FEAT_FIRST, FEAT_STEP),
  skillFeatLevels: everyLevel(SKILL_FEAT_FIRST, SKILL_STEP),
  skillIncreaseLevels: everyLevel(SKILL_INCREASE_FIRST, SKILL_STEP),
} as const;
type SharedSlot = keyof typeof SHARED_SLOT_LEVELS;
const SHARED_SLOTS: readonly SharedSlot[] = [
  'ancestryFeatLevels',
  'generalFeatLevels',
  'skillFeatLevels',
  'skillIncreaseLevels',
];

export const CLASS_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  'attacks',
  'classFeatLevels',
  'defenses',
  'hp',
  'items',
  'keyAbility',
  'perception',
  'savingThrows',
  'spellcasting',
  'trainedSkills',
  ...SHARED_SLOTS,
]);

/** Every class is trained in its class DC at 1st level; Foundry sets it for the actor rather than the class. */
const CLASS_DC = 'class-dc';

/** The statistics Foundry's spellcasting rank covers. */
const SPELLCASTING_SELECTORS = ['spell-attack', 'spell-dc'] as const;

/** Each statistic the class starts above untrained in, by selector, with Foundry's rank. */
function startingRanks(system: FoundryClassSystem): (readonly [string, number])[] {
  const { savingThrows, attacks, defenses } = system;
  return [
    ['perception', system.perception],
    ['save:fortitude', savingThrows.fortitude],
    ['save:reflex', savingThrows.reflex],
    ['save:will', savingThrows.will],
    ['attack:unarmed', attacks.unarmed],
    ['attack:simple', attacks.simple],
    ['attack:martial', attacks.martial],
    ['attack:advanced', attacks.advanced],
    ['defense:unarmored', defenses.unarmored],
    ['defense:light', defenses.light],
    ['defense:medium', defenses.medium],
    ['defense:heavy', defenses.heavy],
    [CLASS_DC, 1],
    ...SPELLCASTING_SELECTORS.map((selector) => [selector, system.spellcasting] as const),
  ];
}

function proficiencies(system: FoundryClassSystem, input: KindInput): void {
  for (const [selector, rank] of startingRanks(system)) {
    const raised = RANKS[rank];
    if (raised !== undefined) {
      addRule(input, selector, { key: RuleElementKey.Proficiency, selector, rank: raised });
    }
  }
  const { other } = system.attacks;
  if (other !== undefined && other.rank > 0) {
    report(input.log, { reason: KindDataGapReason.UnmappedField, field: 'attacks.other', raw: other });
  }
  trainSkills(system.trainedSkills, input);
}

/**
 * A class feat slot at each level: a feat with the class's trait of the character's level or lower, and the grant
 * of the pick. Each slot's flag names its level, so picks keep their slot however the levels change.
 */
function classFeatSlots(levels: readonly number[], input: KindInput): void {
  const trait = slugName(input.envelope.slug);
  for (const level of levels) {
    const flag = `class-feat-${level}`;
    const filter = [`item:trait:${trait}`, { lte: ['item:level', 'self:level'] }];
    addRule(input, 'classFeatLevels', {
      key: RuleElementKey.ChoiceSet,
      flag,
      prompt: `${input.envelope.name} feat`,
      choices: { kind: ContentKind.Feat, filter },
      ...fromLevel(level),
    });
    addRule(input, 'classFeatLevels', { key: RuleElementKey.GrantItem, item: { choice: flag }, ...fromLevel(level) });
  }
}

function sharedSlots(system: FoundryClassSystem, input: KindInput): void {
  for (const field of SHARED_SLOTS) {
    const schedule = SHARED_SLOT_LEVELS[field];
    const levels = system[field]?.value ?? schedule;
    if (levels.length !== schedule.length || levels.some((level, at) => level !== schedule[at])) {
      report(input.log, { reason: KindDataGapReason.UnmappedValue, field, raw: levels });
    }
  }
}

/** The class's data, unparsed; undefined when its `system` is not shaped as a class's. */
export function classData(input: KindInput): object | undefined {
  const system = systemOf(FoundryClassSystem, input);
  if (system === undefined) {
    return undefined;
  }
  proficiencies(system, input);
  grantItems(system.items, 'items', input);
  classFeatSlots(system.classFeatLevels.value, input);
  sharedSlots(system, input);
  const [keyAttribute = []] = attributeSlots({ '0': system.keyAbility }, 'keyAbility', input.log);
  return { keyAttribute, hitPoints: system.hp, additionalSkills: system.trainedSkills.additional };
}
