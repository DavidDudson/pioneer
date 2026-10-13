import { AreaShapeSchema } from '@pioneer/rules/sdk';
import type { RichText } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog } from './kind-data-gaps';
import { setFields } from './kind-fields';
import { castTimeOf, durationOf, rangeOf } from './spell-casting-text';
import { targetsOf } from './spell-targets';
import { plainWords } from './translate-action';

/**
 * The casting fields Foundry stores as English text or structure, which a spell, a variant of it and a rank of its
 * heightening all set: casting time, range, area, targets, duration and defence. A wording that does not map is
 * reported and the field left out.
 */

export const FIELD_MAX = 64;
export const TEXT_MAX = 2000;
export const FoundryText = z.looseObject({ value: z.string().max(TEXT_MAX) });

export const FoundryArea = z.looseObject({
  type: z.string().max(FIELD_MAX),
  value: z.number(),
  details: z.string().max(TEXT_MAX).nullish(),
});

export const FoundryDuration = z.looseObject({
  value: z.string().max(TEXT_MAX),
  sustained: z.boolean().default(false),
});

export const FoundryDefense = z.looseObject({
  save: z.looseObject({ statistic: z.string().max(FIELD_MAX), basic: z.boolean() }).nullish(),
  passive: z.looseObject({ statistic: z.string().max(FIELD_MAX) }).nullish(),
});

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
export function defenseOf(defense: z.infer<typeof FoundryDefense>, log: GapLog): object | undefined {
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
export function reachOf(system: Readonly<Record<string, unknown>>, field: string, log: GapLog): object {
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

/** The casting time Foundry's `time` at `field` gives; unmapped wording is reported. */
export function timeAt(time: unknown, field: string, log: GapLog): object | undefined {
  const text = FoundryText.safeParse(time).data;
  if (text === undefined) {
    return undefined;
  }
  const parsed = castTimeOf(text.value);
  if (parsed === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: `${field}.value`, raw: text.value });
  }
  return parsed;
}
