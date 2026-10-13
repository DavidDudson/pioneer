import { AreaShapeSchema } from '@pioneer/rules/sdk';
import type { RichText } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';
import { setFields, systemOf } from './kind-fields';
import { FoundryRitual, primaryCheckOf, secondaryChecksOf } from './ritual-checks';
import { castTimeOf, durationOf, rangeOf } from './spell-casting-text';
import {
  chosenTypes,
  damageParts,
  FoundryDamage,
  FoundryDamageOverrides,
  FoundryHeightening,
  heightenedDamage,
  heighteningOf,
  partKeys,
} from './spell-damage';
import type { RankChanges } from './spell-damage';
import { targetsOf } from './spell-targets';
import { plainWords } from './translate-action';

/**
 * A spell's or ritual's `data` from Foundry's `spell` item (a ritual is one with ritual data). Foundry stores casting
 * time, range, targets and duration as English, which map when their whole wording does (ADR-0021); a wording that
 * does not is reported and the field left out, except a casting time, without which there is no data. Areas,
 * defences, traditions, damage and heightening are structured in Foundry too and carry over.
 */

/** `system` fields a spell and a ritual both read. */
const CASTING_FIELDS = ['area', 'cost', 'defense', 'duration', 'range', 'requirements', 'target', 'time'];

export const SPELL_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  ...CASTING_FIELDS,
  'counteraction',
  'damage',
  'heightening',
]);

export const RITUAL_FIELDS: ReadonlySet<string> = new Set([...ENVELOPE_FIELDS, ...CASTING_FIELDS, 'ritual']);

const FIELD_MAX = 64;
const TEXT_MAX = 2000;
const LIST_MAX = 8;

const FoundryText = z.looseObject({ value: z.string().max(TEXT_MAX) });

const FoundryArea = z.looseObject({
  type: z.string().max(FIELD_MAX),
  value: z.number(),
  details: z.string().max(TEXT_MAX).nullish(),
});

const FoundryDuration = z.looseObject({ value: z.string().max(TEXT_MAX), sustained: z.boolean().default(false) });

const FoundryDefense = z.looseObject({
  save: z.looseObject({ statistic: z.string().max(FIELD_MAX), basic: z.boolean() }).nullish(),
  passive: z.looseObject({ statistic: z.string().max(FIELD_MAX) }).nullish(),
});

const Traditions = z.array(z.string().max(FIELD_MAX)).max(LIST_MAX).default([]);

const FoundrySpellSystem = z.looseObject({
  level: z.looseObject({ value: z.number() }),
  time: FoundryText,
  range: FoundryText.nullish(),
  target: FoundryText.nullish(),
  area: FoundryArea.nullish(),
  duration: FoundryDuration.nullish(),
  defense: FoundryDefense.nullish(),
  cost: FoundryText.nullish(),
  requirements: z.string().max(TEXT_MAX).nullish(),
  traits: z.looseObject({ traditions: Traditions }).optional(),
  damage: FoundryDamage.default({}),
  overlays: z.unknown().optional(),
  heightening: FoundryHeightening.nullish(),
  counteraction: z.boolean().default(false),
  ritual: FoundryRitual.nullish(),
});
type FoundrySpellSystem = z.infer<typeof FoundrySpellSystem>;

/** Foundry text at `field`, and the parser for its wording. */
interface TextField {
  readonly field: string;
  readonly text: string | undefined;
  readonly parse: (text: string) => object | undefined;
}

/** Text parsed by `parse`; blank text is none, and text that does not map is reported against `field`. */
function parsedText({ field, text, parse }: TextField, log: GapLog): object | undefined {
  if (text === undefined || text.trim() === '') {
    return undefined;
  }
  const parsed = parse(text);
  if (parsed === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field, raw: text });
  }
  return parsed;
}

/** What details may add to an area and still only restate it: "15-foot emanation, centered on you". */
const RESTATING = ['.', ' centered on you', ','];

/** Details stripped of what restates the area, and "20-foot-radius" read as "20-foot". */
function restatement(details: string): string {
  let text = details.toLowerCase().replace('-foot-radius ', '-foot ');
  for (const ending of RESTATING) {
    text = text.endsWith(ending) ? text.slice(0, -ending.length) : text;
  }
  return text;
}

/** Foundry's `details`, unless they say no more than the shape and size do ("20-foot-radius burst"). */
function areaDetails(area: z.infer<typeof FoundryArea>, field: string, log: GapLog): RichText | undefined {
  const details = (area.details ?? '').trim();
  const isRestated = restatement(details) === `${area.value}-foot ${area.type}`;
  return isRestated ? undefined : plainWords(`${field}.details`, details, log);
}

/** An area's shape and size, and Foundry's `details` when they narrow it; a shape Pioneer lacks is reported. */
function areaOf(area: z.infer<typeof FoundryArea>, field: string, log: GapLog): object | undefined {
  const shape = AreaShapeSchema.safeParse(area.type);
  if (!shape.success) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: `${field}.type`, raw: area.type });
    return undefined;
  }
  return { shape: shape.data, size: area.value, ...setFields({ details: areaDetails(area, field, log) }) };
}

/** Foundry's DC statistics for a passive defence: `ac`, and `<save>-dc` for a save's DC. */
const PASSIVE_DC = /^(?<save>fortitude|reflex|will)-dc$/u;
const ARMOR_CLASS = 'ac';

/** The save asked for and the passive defence targeted; an unknown passive statistic is reported. */
function defenseOf(defense: z.infer<typeof FoundryDefense>, log: GapLog): object | undefined {
  const { save, passive } = defense;
  const dc = passive === undefined || passive === null ? undefined : PASSIVE_DC.exec(passive.statistic)?.groups;
  const against = passive?.statistic === ARMOR_CLASS ? ARMOR_CLASS : dc && `save:${dc['save']}`;
  if (passive !== undefined && passive !== null && against === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'defense.passive', raw: passive.statistic });
  }
  const fields = setFields({
    save: save === undefined || save === null ? undefined : { statistic: `save:${save.statistic}`, basic: save.basic },
    against,
  });
  return Object.keys(fields).length === 0 ? undefined : fields;
}

/** A duration; none for an instant spell (blank and not sustained), and one whose wording does not map is reported. */
function durationField(field: string, duration: z.infer<typeof FoundryDuration>, log: GapLog): object | undefined {
  if (duration.value.trim() === '' && !duration.sustained) {
    return undefined;
  }
  const parsed = durationOf(duration);
  if (parsed === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field, raw: duration });
  }
  return parsed;
}

/** The casting fields that may also change by rank: range, area, targets and duration. */
function reachOf(system: Readonly<Record<string, unknown>>, field: string, log: GapLog): object {
  const range = FoundryText.safeParse(system['range']).data;
  const target = FoundryText.safeParse(system['target']).data;
  const area = FoundryArea.safeParse(system['area']).data;
  const duration = FoundryDuration.safeParse(system['duration']).data;
  return setFields({
    range: parsedText({ field: `${field}range.value`, text: range?.value, parse: rangeOf }, log),
    area: area && areaOf(area, `${field}area`, log),
    targets: parsedText({ field: `${field}target.value`, text: target?.value, parse: targetsOf }, log),
    duration: duration && durationField(`${field}duration`, duration, log),
  });
}

/** What casting takes; undefined when the casting time does not map. */
function castingOf(system: FoundrySpellSystem, log: GapLog): object | undefined {
  const time = castTimeOf(system.time.value);
  if (time === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'time.value', raw: system.time.value });
    return undefined;
  }
  return {
    rank: system.level.value,
    time,
    ...reachOf(system, '', log),
    ...setFields({
      defense: system.defense ? defenseOf(system.defense, log) : undefined,
      cost: system.cost ? plainWords('cost.value', system.cost.value.trim(), log) : undefined,
      requirements: plainWords('requirements', (system.requirements ?? '').trim(), log),
    }),
  };
}

/** What fixed heightening may change at a rank. */
const RANK_CHANGES: ReadonlySet<string> = new Set(['area', 'damage', 'duration', 'range', 'target']);

/** How a fixed rank's changes translate: as the spell's own fields, its damage laid over the spell's. */
function rankChanges(base: FoundryDamage, chosen: ReadonlySet<string>, log: GapLog): RankChanges {
  return (changes, field) => {
    const overrides = FoundryDamageOverrides.safeParse(changes['damage']).data;
    for (const key of Object.keys(changes).filter((each) => !RANK_CHANGES.has(each))) {
      report(log, { reason: KindDataGapReason.UnmappedField, field: `${field}.${key}`, raw: changes[key] });
    }
    return {
      ...reachOf(changes, `${field}.`, log),
      ...setFields({
        damage: overrides && heightenedDamage({ overrides, base, field: `${field}.damage`, chosen }, log),
      }),
    };
  };
}

/** A spell's data, unparsed; undefined when its `system` is not shaped as a spell's or its casting time does not map. */
export function spellData(input: KindInput): object | undefined {
  const { log } = input;
  const system = systemOf(FoundrySpellSystem, input);
  const casting = system && castingOf(system, log);
  if (system === undefined || casting === undefined) {
    return undefined;
  }
  const chosen = chosenTypes(system.overlays);
  const damage = damageParts(system.damage, { field: 'damage', chosen }, log);
  const changesOf = rankChanges(system.damage, chosen, log);
  const { heightening } = system;
  return {
    ...casting,
    traditions: system.traits?.traditions ?? [],
    damage,
    ...setFields({
      heightening: heightening ? heighteningOf({ heightening, kept: partKeys(damage), changesOf, log }) : undefined,
      counteraction: system.counteraction ? true : undefined,
    }),
  };
}

/** A ritual's data, unparsed; undefined when its casting time or checks do not map. */
export function ritualData(input: KindInput): object | undefined {
  const { log } = input;
  const system = systemOf(FoundrySpellSystem, input);
  const casting = system && castingOf(system, log);
  const ritual = system?.ritual;
  const checks = ritual ? ritualChecks(ritual, log) : undefined;
  return casting && checks && { ...casting, ...checks };
}

/** A ritual's primary and secondary checks; undefined, and reported, when either does not map. */
function ritualChecks({ primary, secondary }: FoundryRitual, log: GapLog): object | undefined {
  const check = primaryCheckOf(primary.check);
  const checks = secondaryChecksOf(secondary.checks);
  if (check === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'ritual.primary.check', raw: primary.check });
  }
  if (checks === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'ritual.secondary.checks', raw: secondary.checks });
  }
  return check && checks && { primary: check, secondary: { checks, casters: secondary.casters } };
}
