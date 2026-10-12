import { RuleElementKey, slugName } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { addRule, ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { attributeSlots, featSlots, FoundryGrantedItems, grantItems, systemOf } from './kind-fields';
import { FoundryTrainedSkills, trainSkills } from './translate-background';
import { CLASS_DC, FoundryRank, RANKS } from './translate-proficiencies';

/**
 * A class's `data` from Foundry's `class` item, and its progression as rule elements (content-model.md, "Class
 * progression"): a `Proficiency` per starting rank, a `GrantItem` per class feature from its level, and a class feat
 * slot (`ChoiceSet` and the `GrantItem` of its pick) at each class, general and skill feat level. Its skill increase levels
 * stay data, as the builder opens their slots. Later ranks come from the class features that raise them, as in Foundry.
 */

const FIELD_MAX = 64;
const LEVELS_MAX = 20;

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

/** Player Core's ancestry feat levels: the ancestry entry opens these slots (`translate-ancestry.ts`). */
export const ANCESTRY_FEAT_LEVELS: readonly number[] = everyLevel(ANCESTRY_FEAT_FIRST, FEAT_STEP);

/** Player Core's schedule for the slots every class shares, used when Foundry gives a class none. */
const SHARED_SLOT_LEVELS = {
  ancestryFeatLevels: ANCESTRY_FEAT_LEVELS,
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

/**
 * The tag each Player Core class's subclass options carry, which its subclass `ChoiceSet` filters on. Foundry marks no
 * choice as the subclass, and a wizard has two tag queries (arcane school and thesis), so it is named here; a later
 * book's classes are added with its import, or by hand in the pack (ADR-0031).
 */
const SUBCLASS_TAGS: ReadonlyMap<string, string> = new Map([
  ['bard', 'bard-muse'],
  ['cleric', 'cleric-doctrine'],
  ['druid', 'druid-order'],
  ['ranger', 'ranger-hunters-edge'],
  ['rogue', 'rogue-racket'],
  ['witch', 'witch-patron'],
  ['wizard', 'wizard-arcane-school'],
]);

/**
 * Each statistic the class starts above untrained in, by selector, with Foundry's rank. Every class is trained in its
 * class DC at 1st level; Foundry sets it for the actor rather than the class.
 */
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
    // One rank for all of the character's spellcasting, as Foundry keeps it (ADR-0040).
    ['spellcasting', system.spellcasting],
    [CLASS_DC, 1],
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

function sameLevels(levels: readonly number[], schedule: readonly number[]): boolean {
  return levels.length === schedule.length && levels.every((level, at) => level === schedule[at]);
}

/**
 * The ancestry feat slots, which a class cannot open itself: the ancestry entry opens them on Player Core's schedule,
 * so a class off it is reported.
 */
function reportAncestryFeatLevels(system: FoundryClassSystem, { log }: KindInput): void {
  const ancestryLevels = system.ancestryFeatLevels?.value ?? ANCESTRY_FEAT_LEVELS;
  if (!sameLevels(ancestryLevels, ANCESTRY_FEAT_LEVELS)) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'ancestryFeatLevels', raw: ancestryLevels });
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
  slots(system, input);
  const [keyAttribute = []] = attributeSlots({ '0': system.keyAbility }, 'keyAbility', input.log);
  const subclass = SUBCLASS_TAGS.get(slugName(input.envelope.slug));
  return {
    keyAttribute,
    hitPoints: system.hp,
    additionalSkills: system.trainedSkills.additional,
    skillIncreaseLevels: system.skillIncreaseLevels?.value ?? SHARED_SLOT_LEVELS.skillIncreaseLevels,
    ...(subclass === undefined ? {} : { subclass }),
  };
}

/** The class, general and skill feat slots, at Foundry's levels (Player Core's when Foundry gives none). */
function slots(system: FoundryClassSystem, input: KindInput): void {
  const trait = slugName(input.envelope.slug);
  featSlots(
    { slot: 'class-feat', trait, prompt: `${input.envelope.name} feat`, field: 'classFeatLevels' },
    system.classFeatLevels.value,
    input,
  );
  const general = system.generalFeatLevels?.value ?? SHARED_SLOT_LEVELS.generalFeatLevels;
  featSlots(
    { slot: 'general-feat', trait: 'general', prompt: 'General feat', field: 'generalFeatLevels' },
    general,
    input,
  );
  const skill = system.skillFeatLevels?.value ?? SHARED_SLOT_LEVELS.skillFeatLevels;
  featSlots({ slot: 'skill-feat', trait: 'skill', prompt: 'Skill feat', field: 'skillFeatLevels' }, skill, input);
  reportAncestryFeatLevels(system, input);
}
