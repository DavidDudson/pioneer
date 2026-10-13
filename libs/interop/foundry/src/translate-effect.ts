import { EffectBadgeType, EffectCategory, EffectDurationType } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { fromFoundryFormula } from './foundry-formula';
import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';
import { setFields, systemOf } from './kind-fields';

/**
 * An effect's `data` from Foundry's `effect` item: its category, from the pack it is in; its duration; and its badge.
 * When it started, its token icon, whether it is identified and the action that applied it are play state, not
 * content (content-model.md, "Effects").
 */

export const EFFECT_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  'badge',
  'context',
  'duration',
  'start',
  'tokenIcon',
  'unidentified',
]);

/** Each effect pack's category, by compendium name. */
const PACK_CATEGORIES: ReadonlyMap<string, EffectCategory> = new Map([
  ['spell-effects', EffectCategory.Spell],
  ['feat-effects', EffectCategory.Feat],
  ['equipment-effects', EffectCategory.Equipment],
  ['other-effects', EffectCategory.Other],
  ['campaign-effects', EffectCategory.Other],
  ['bestiary-effects', EffectCategory.Other],
]);

/** Foundry's plural duration units, by the unit each is. */
const DURATION_UNITS: ReadonlyMap<string, string> = new Map([
  ['rounds', 'round'],
  ['minutes', 'minute'],
  ['hours', 'hour'],
  ['days', 'day'],
]);

const UNTIMED: ReadonlyMap<string, EffectDurationType> = new Map([
  ['unlimited', EffectDurationType.Unlimited],
  ['encounter', EffectDurationType.Encounter],
]);

/** When a duration of no time ends: at the start or the end of the turn. */
const TURN_EXPIRIES: ReadonlySet<string> = new Set(['turn-start', 'turn-end']);

const FIELD_MAX = 64;
const FORMULA_MAX = 200;
const LABEL_MAX = 200;
const LABELS_MAX = 20;

const FoundryBadge = z.looseObject({
  type: z.string().max(FIELD_MAX),
  value: z.union([z.number(), z.string().max(FORMULA_MAX)]),
  min: z.number().nullish(),
  max: z.number().nullish(),
  labels: z.array(z.string().max(LABEL_MAX)).max(LABELS_MAX).nullish(),
  loop: z.boolean().nullish(),
  reevaluate: z.string().max(FIELD_MAX).nullish(),
});
type FoundryBadge = z.infer<typeof FoundryBadge>;

const FoundryEffectSystem = z.looseObject({
  duration: z.looseObject({
    value: z.number(),
    unit: z.string().max(FIELD_MAX),
    expiry: z.string().max(FIELD_MAX).nullish(),
    sustained: z.boolean().default(false),
  }),
  badge: FoundryBadge.nullish(),
});
type FoundryEffectSystem = z.infer<typeof FoundryEffectSystem>;

/**
 * A timed duration (rounds to days, with when in the round it ends), a `turn` (a count of none that ends at a turn's
 * start or end), `encounter`, or `unlimited`. Any other count of none and units Pioneer lacks are reported.
 */
function durationOf({ duration }: FoundryEffectSystem, log: GapLog): object | undefined {
  const { value, unit, expiry, sustained } = duration;
  const untimed = UNTIMED.get(unit);
  if (untimed !== undefined) {
    return { type: untimed };
  }
  const singular = DURATION_UNITS.get(unit);
  if (singular !== undefined && value === 0 && TURN_EXPIRIES.has(expiry ?? '')) {
    return { type: EffectDurationType.Turn, expiry };
  }
  if (singular === undefined || value <= 0) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'duration', raw: duration });
    return undefined;
  }
  return {
    type: EffectDurationType.Time,
    count: value,
    unit: singular,
    ...setFields({ expiry: expiry ?? undefined, sustained: sustained ? true : undefined }),
  };
}

/** A counter badge, or a rolled formula; any other kind of badge is reported. */
function badgeOf(badge: FoundryBadge, log: GapLog): object | undefined {
  if (badge.type === EffectBadgeType.Counter) {
    return {
      type: EffectBadgeType.Counter,
      value: badge.value,
      ...setFields({
        min: badge.min ?? undefined,
        max: badge.max ?? undefined,
        labels: badge.labels ?? undefined,
        loop: badge.loop ?? undefined,
      }),
    };
  }
  if (badge.type === EffectBadgeType.Formula && typeof badge.value === 'string') {
    const reevaluate = badge.reevaluate ?? undefined;
    return { type: EffectBadgeType.Formula, formula: fromFoundryFormula(badge.value), ...setFields({ reevaluate }) };
  }
  report(log, { reason: KindDataGapReason.UnmappedValue, field: 'badge.type', raw: badge.type });
  return undefined;
}

/** The effect's data, unparsed; undefined when it has no category or its duration does not map. */
export function effectData(input: KindInput): object | undefined {
  const { pack, log } = input;
  const category = PACK_CATEGORIES.get(pack.name);
  if (category === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'category', raw: pack.name });
  }
  const system = systemOf(FoundryEffectSystem, input);
  const duration = system && durationOf(system, log);
  if (category === undefined || system === undefined || duration === undefined) {
    return undefined;
  }
  const badge = system.badge ? badgeOf(system.badge, log) : undefined;
  return { category, duration, ...setFields({ badge }) };
}
