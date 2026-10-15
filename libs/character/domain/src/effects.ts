import type { GrantRoot } from '@pioneer/rules/grants';
import {
  ContentId,
  ContentKind,
  DurationUnit,
  EffectBadgeType,
  EffectDurationType,
  EffectExpiry,
  OriginHopKind,
} from '@pioneer/rules/sdk';
import type { ContentRegistry, DamageFormula, DurationCount, EffectData } from '@pioneer/rules/sdk';
import { Pg, Uuid } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** The most effects a character has active at once, however many sources they come from. */
export const EFFECTS_MAX = 64;

/** The longest an ally's name runs on an effect's source. */
const ALLY_NAME_MAX = 80;

/** The name of the ally an effect came from. */
export const EffectAllyName = z.string().trim().min(1).max(ALLY_NAME_MAX).brand<'EffectAllyName'>();
export type EffectAllyName = z.infer<typeof EffectAllyName>;

/** Rounds in each unit of time: a round is 6 seconds, so a minute is 10 rounds. */
const ROUNDS_PER_UNIT = {
  [DurationUnit.Round]: 1,
  [DurationUnit.Minute]: 10,
  [DurationUnit.Hour]: 600,
  [DurationUnit.Day]: 14_400,
} as const satisfies Record<DurationUnit, number>;

/** One effect on a character, apart from its content: an instance may be removed or changed on its own. */
export const EffectInstanceId = Uuid.brand<'EffectInstanceId'>();
export type EffectInstanceId = z.infer<typeof EffectInstanceId>;

/** A count of rounds an effect has left. A day is 14,400 rounds, so it is more than a smallint holds. */
export const EffectRounds = Pg.integer().positive().brand<'EffectRounds'>();
export type EffectRounds = z.infer<typeof EffectRounds>;

/** The number an effect's badge shows. */
export const EffectBadgeValue = Pg.smallint().brand<'EffectBadgeValue'>();
export type EffectBadgeValue = z.infer<typeof EffectBadgeValue>;

/** Who an effect comes from. The sheet writes to no one else's sheet, so an ally's buff is recorded here by its giver. */
export const EffectSourceKind = { Self: 'self', Ally: 'ally', Gm: 'gm' } as const;
export type EffectSourceKind = ValueOf<typeof EffectSourceKind>;

export const EffectSourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal(EffectSourceKind.Self) }),
  z.strictObject({ kind: z.literal(EffectSourceKind.Ally), name: EffectAllyName }),
  z.strictObject({ kind: z.literal(EffectSourceKind.Gm) }),
]);
export type EffectSource = z.infer<typeof EffectSourceSchema>;

/** An effect the character applied to itself. */
export const SELF: EffectSource = { kind: EffectSourceKind.Self };

/**
 * An effect active on a character, as an input: which effect, who it came from, the rounds it has left (none for one
 * with no clock: until the turn ends, the encounter ends or someone removes it), when it ends once they run out,
 * whether it is sustained, and the number its badge shows. What it does to the statistics is the content's rules,
 * worked out on every read.
 */
export const ActiveEffectSchema = z.strictObject({
  id: EffectInstanceId,
  effect: ContentId,
  source: EffectSourceSchema.default(SELF),
  remaining: EffectRounds.optional(),
  expiry: z.enum(EffectExpiry).optional(),
  sustained: z.boolean().optional(),
  badge: EffectBadgeValue.optional(),
});
export type ActiveEffect = z.infer<typeof ActiveEffectSchema>;

export const ActiveEffectsSchema = z.array(ActiveEffectSchema).max(EFFECTS_MAX).default([]);

/** The rounds `count` of `unit` last. */
export function durationRounds(count: DurationCount, unit: DurationUnit): EffectRounds {
  return EffectRounds.parse(count * ROUNDS_PER_UNIT[unit]);
}

/** The badge an effect starts with, as the content gives it: a counter's bounds, or a formula to roll. */
export type EffectBadgeTerms =
  | {
      readonly type: typeof EffectBadgeType.Counter;
      readonly value: EffectBadgeValue;
      readonly min: EffectBadgeValue | undefined;
      readonly max: EffectBadgeValue | undefined;
      readonly loop: boolean;
    }
  | { readonly type: typeof EffectBadgeType.Formula; readonly formula: DamageFormula };

/** A counter badge's terms. */
export type CounterTerms = Extract<EffectBadgeTerms, { type: typeof EffectBadgeType.Counter }>;

/** What applying an effect starts from, read from its content: the clock, when it ends, and the badge. */
export interface EffectTerms {
  readonly remaining: EffectRounds | undefined;
  readonly expiry: EffectExpiry | undefined;
  readonly sustained: boolean;
  readonly badge: EffectBadgeTerms | undefined;
}

/** The effects the content has, by id. */
export type EffectContent = ReadonlyMap<ContentId, EffectTerms>;

/** No effect content, for edits that don't read it. */
export const NO_EFFECTS: EffectContent = new Map();

/** A counter counts from 1 unless the content says otherwise, as Foundry's badges do. */
const COUNTER_FLOOR = 1;

/** The counter terms of `badge`: it starts at its value, counts up from its floor and ends at its last label when it has labels. */
function counterTerms(
  badge: Extract<NonNullable<EffectData['badge']>, { type: typeof EffectBadgeType.Counter }>,
): CounterTerms {
  const value = EffectBadgeValue.parse(badge.value);
  const min = EffectBadgeValue.parse(badge.min ?? Math.min(badge.value, COUNTER_FLOOR));
  const labelled = badge.labels === undefined ? undefined : EffectBadgeValue.parse(min + badge.labels.length - 1);
  const max = badge.max === undefined ? labelled : EffectBadgeValue.parse(badge.max);
  return { type: EffectBadgeType.Counter, value, min, max, loop: badge.loop === true };
}

function badgeTerms(badge: EffectData['badge']): EffectBadgeTerms | undefined {
  if (badge === undefined) {
    return undefined;
  }
  return badge.type === EffectBadgeType.Counter
    ? counterTerms(badge)
    : { type: EffectBadgeType.Formula, formula: badge.formula };
}

/**
 * What applying `data` starts from. A timed effect lasts its duration in rounds and ends at its `expiry`, the start of
 * a turn when the content names none. A turn effect has no clock but ends at its expiry; the encounter and unlimited
 * effects have neither.
 */
export function effectTerms(data: EffectData): EffectTerms {
  const { duration } = data;
  const badge = badgeTerms(data.badge);
  switch (duration.type) {
    case EffectDurationType.Time: {
      return {
        remaining: durationRounds(duration.count, duration.unit),
        expiry: duration.expiry ?? EffectExpiry.TurnStart,
        sustained: duration.sustained === true,
        badge,
      };
    }
    case EffectDurationType.Turn: {
      return { remaining: undefined, expiry: duration.expiry, sustained: false, badge };
    }
    case EffectDurationType.Encounter:
    case EffectDurationType.Unlimited: {
      return { remaining: undefined, expiry: undefined, sustained: false, badge };
    }
    default: {
      return duration satisfies never;
    }
  }
}

/** The effects of the registry's packs, by id; the last pack's entry wins, as in the registry. */
export function effectContent(registry: ContentRegistry): EffectContent {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  return new Map(
    entries.flatMap((entry) =>
      entry.kind === ContentKind.Effect ? [[entry.id, effectTerms(entry.data)] as const] : [],
    ),
  );
}

/**
 * The effects as roots of the effective set, each behind an effect hop, so their modifiers show in breakdowns until
 * they end. An instance's rule elements read its badge as `item.badge.value`.
 */
export function effectRoots(effects: readonly ActiveEffect[]): readonly GrantRoot[] {
  return effects.map(({ effect }) => ({ entry: effect, hop: { kind: OriginHopKind.Effect, effect } }));
}

/**
 * The value a counter badge steps to from `value`, one step `up` or down: held at its bounds, or looping past them
 * when the content says so. A badge with no bound on a side has no end there.
 */
export function steppedBadge(terms: CounterTerms, value: EffectBadgeValue, up: boolean): EffectBadgeValue {
  const next = value + (up ? 1 : -1);
  const { min, max, loop } = terms;
  if (max !== undefined && next > max) {
    return EffectBadgeValue.parse(loop && min !== undefined ? min : max);
  }
  if (min !== undefined && next < min) {
    return EffectBadgeValue.parse(loop && max !== undefined ? max : min);
  }
  return EffectBadgeValue.parse(next);
}
