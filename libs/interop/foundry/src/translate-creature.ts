import { DamageAdjustmentTargetSchema, Immunity } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';
import { FOUNDRY_SIZES, systemOf } from './kind-fields';
import { creatureRole } from './select-entries';

/**
 * A creature's core statistics from a Foundry `npc` actor: level and traits are the envelope's; the data holds its
 * size, perception, attributes, AC, saves, HP, immunities, weaknesses and resistances, speeds, skills, senses and
 * languages. Strikes, abilities, spellcasting and carried items are the embedded items', translated separately.
 * A Foundry value with no home in the stat block is reported against the entry, never dropped silently.
 */

/**
 * `system` fields read here or by the envelope, or that say nothing (`initiative` is perception unless reported
 * below). Embedded spellcasting `rituals`, focus `resources` and the like stay unhandled, so they are reported.
 */
export const CREATURE_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  'abilities',
  'attributes',
  'details',
  'initiative',
  'perception',
  'saves',
  'skills',
]);

const FIELD_MAX = 64;
const LIST_MAX = 64;
const NAME_MAX = 500;

const Name = z.string().max(NAME_MAX);
const Slug = z.string().max(FIELD_MAX);
const Slugs = z.array(Slug).max(LIST_MAX);

const Modifier = z.looseObject({ mod: z.number() });
const Abilities = z.looseObject({
  str: Modifier,
  dex: Modifier,
  con: Modifier,
  int: Modifier,
  wis: Modifier,
  cha: Modifier,
});

const Defence = z.looseObject({ type: Slug, exceptions: Slugs.default([]), doubleVs: Slugs.default([]) });
const Adjustment = Defence.extend({ value: z.number() });
const Detailed = { details: Name.default('') };
const ArmorClass = z.looseObject({ value: z.number(), ...Detailed });
const HitPoints = z.looseObject({ max: z.number(), ...Detailed });
const OtherSpeed = z.looseObject({ type: Slug, value: z.number() });
// A creature that doesn't walk (a banshee) has no land speed.
const Speed = z.looseObject({
  value: z.number().nullable(),
  otherSpeeds: z.array(OtherSpeed).max(LIST_MAX).default([]),
  ...Detailed,
});
const AllSaves = z.looseObject({ value: Name.default('') });
const Attributes = z.looseObject({
  ac: ArmorClass,
  hp: HitPoints,
  immunities: z.array(Defence).max(LIST_MAX).default([]),
  weaknesses: z.array(Adjustment).max(LIST_MAX).default([]),
  resistances: z.array(Adjustment).max(LIST_MAX).default([]),
  speed: Speed,
  allSaves: AllSaves.optional(),
});

const FoundrySense = z.looseObject({ type: Slug, acuity: Slug.optional(), range: z.number().optional() });
const Perception = z.looseObject({
  mod: z.number(),
  senses: z.array(FoundrySense).max(LIST_MAX).default([]),
  ...Detailed,
});

const Save = z.looseObject({ value: z.number(), saveDetail: Name.default('') });
const Saves = z.looseObject({ fortitude: Save, reflex: Save, will: Save });
const Skill = z.looseObject({ base: z.number() });
const Languages = z.looseObject({ value: Slugs.default([]), ...Detailed });
const Details = z.looseObject({ languages: Languages.default({ value: [], details: '' }) });
const Size = z.looseObject({ size: z.looseObject({ value: Slug }) });
const Initiative = z.looseObject({ statistic: Slug.default('perception') });

const FoundryCreatureSystem = z.looseObject({
  abilities: Abilities,
  attributes: Attributes,
  perception: Perception,
  saves: Saves,
  skills: z.record(Slug, Skill).default({}),
  details: Details,
  traits: Size,
  initiative: Initiative.optional(),
});

/** Foundry spells the target of an all-damage resistance `all-damage`; the stat block's `all`. */
const DAMAGE_TARGETS: ReadonlyMap<string, string> = new Map([['all-damage', 'all']]);

/** A creature with no land speed has a land speed of 0 feet. */
const NO_LAND_SPEED = 0;

/** Foundry's default initiative statistic, which says nothing. */
const DEFAULT_INITIATIVE = 'perception';

function reportText(log: GapLog, field: string, text: string): void {
  if (text !== '') {
    report(log, { reason: KindDataGapReason.UnmappedField, field, raw: text });
  }
}

interface Adjusted {
  readonly type: string;
  readonly value: number;
  readonly exceptions?: readonly string[];
}

/** Weaknesses or resistances: a damage type or group with a value; one outside the stat block's targets is reported. */
function adjustments(list: readonly z.infer<typeof Adjustment>[], field: string, log: GapLog): readonly Adjusted[] {
  return list.flatMap(({ type, value, exceptions, doubleVs }) => {
    const target = DamageAdjustmentTargetSchema.safeParse(DAMAGE_TARGETS.get(type) ?? type);
    if (!target.success) {
      report(log, { reason: KindDataGapReason.UnmappedValue, field: `${field}.type`, raw: type });
      return [];
    }
    if (doubleVs.length > 0) {
      report(log, { reason: KindDataGapReason.UnmappedField, field: `${field}.doubleVs`, raw: doubleVs });
    }
    return [{ type: target.data, value, ...(exceptions.length > 0 ? { exceptions } : {}) }];
  });
}

function immunities(list: readonly z.infer<typeof Defence>[], log: GapLog): readonly string[] {
  return list.flatMap(({ type, exceptions }) => {
    if (exceptions.length > 0) {
      report(log, {
        reason: KindDataGapReason.UnmappedField,
        field: 'attributes.immunities.exceptions',
        raw: exceptions,
      });
    }
    const immunity = Immunity.safeParse(type);
    if (!immunity.success) {
      report(log, { reason: KindDataGapReason.UnmappedValue, field: 'attributes.immunities.type', raw: type });
    }
    return immunity.success ? [immunity.data] : [];
  });
}

/** The creature's size, or the gap when Foundry's abbreviation has no mapping. */
function sizeOf(value: string, log: GapLog): string | undefined {
  const size = FOUNDRY_SIZES.get(value);
  if (size === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'traits.size.value', raw: value });
  }
  return size;
}

function details(system: z.infer<typeof FoundryCreatureSystem>, log: GapLog): void {
  const { attributes, perception, saves, details: creature, initiative } = system;
  reportText(log, 'attributes.ac.details', attributes.ac.details);
  reportText(log, 'attributes.hp.details', attributes.hp.details);
  reportText(log, 'attributes.speed.details', attributes.speed.details);
  reportText(log, 'attributes.allSaves', attributes.allSaves?.value ?? '');
  reportText(log, 'perception.details', perception.details);
  reportText(log, 'saves.fortitude.saveDetail', saves.fortitude.saveDetail);
  reportText(log, 'saves.reflex.saveDetail', saves.reflex.saveDetail);
  reportText(log, 'saves.will.saveDetail', saves.will.saveDetail);
  reportText(log, 'details.languages.details', creature.languages.details);
  if (initiative !== undefined && initiative.statistic !== DEFAULT_INITIATIVE) {
    report(log, { reason: KindDataGapReason.UnmappedField, field: 'initiative.statistic', raw: initiative.statistic });
  }
}

/** The creature's data, unparsed; undefined when its `system` is not shaped as a creature's. */
export function creatureData(input: KindInput): object | undefined {
  const system = systemOf(FoundryCreatureSystem, input);
  if (system === undefined) {
    return undefined;
  }
  const { log, pack } = input;
  const { abilities, attributes, perception, saves } = system;
  details(system, log);
  const size = sizeOf(system.traits.size.value, log);
  const senses = perception.senses.map(({ type, acuity, range }) => ({
    sense: type,
    ...(acuity === undefined ? {} : { acuity }),
    ...(range === undefined ? {} : { range }),
  }));
  const speeds = attributes.speed.otherSpeeds.map(({ type, value }) => ({ movement: type, speed: value }));
  const skills = Object.entries(system.skills).map(([skill, { base }]) => ({ skill, modifier: base }));
  const languages = system.details.languages.value;
  return {
    role: creatureRole(pack.directory),
    ...(size === undefined ? {} : { size }),
    perception: perception.mod,
    attributes: {
      str: abilities.str.mod,
      dex: abilities.dex.mod,
      con: abilities.con.mod,
      int: abilities.int.mod,
      wis: abilities.wis.mod,
      cha: abilities.cha.mod,
    },
    armorClass: attributes.ac.value,
    saves: { fortitude: saves.fortitude.value, reflex: saves.reflex.value, will: saves.will.value },
    hitPoints: attributes.hp.max,
    immunities: immunities(attributes.immunities, log),
    weaknesses: adjustments(attributes.weaknesses, 'attributes.weaknesses', log),
    resistances: adjustments(attributes.resistances, 'attributes.resistances', log),
    speed: attributes.speed.value ?? NO_LAND_SPEED,
    ...(skills.length > 0 ? { skills } : {}),
    ...(senses.length > 0 ? { senses } : {}),
    ...(languages.length > 0 ? { languages } : {}),
    ...(speeds.length > 0 ? { speeds } : {}),
  };
}
