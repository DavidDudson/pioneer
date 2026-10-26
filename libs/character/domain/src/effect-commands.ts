import { ContentId, EffectBadgeType, HitPoints, RollOption, SpellRank } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { EFFECTS_MAX, EffectBadgeValue, EffectInstanceId, EffectRounds, EffectSourceSchema, SELF } from './effects';
import type { ActiveEffect, CounterTerms, EffectBadgeTerms, EffectContent, EffectTerms } from './effects';

/** The play edits that apply, change and remove effects. */
export const EffectCommandField = {
  /** Puts an effect on the character, with its clock and badge as the content gives them. */
  ApplyEffect: 'applyEffect',
  RemoveEffect: 'removeEffect',
  /** The rounds an effect has left set outright, as when correcting a count or an effect from another creature. */
  SetEffectRemaining: 'setEffectRemaining',
  SetEffectBadge: 'setEffectBadge',
} as const;
export type EffectCommandField = ValueOf<typeof EffectCommandField>;

export const EffectCommandSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal(EffectCommandField.ApplyEffect),
    id: EffectInstanceId,
    effect: ContentId,
    source: EffectSourceSchema.default(SELF),
    /** What a formula badge rolled when the effect was applied; the sheet rolls it, as it rolls every die. */
    rolled: EffectBadgeValue.optional(),
    /** The form chosen for a polymorph effect, as the roll option its choice sets. */
    form: RollOption.optional(),
    /** The spell rank the effect is cast at. */
    rank: SpellRank.optional(),
    /** The temporary Hit Points the form gives, worked out by the sheet from the engine; they leave with the effect. */
    tempHp: HitPoints.optional(),
  }),
  z.object({ field: z.literal(EffectCommandField.RemoveEffect), id: EffectInstanceId }),
  z.object({ field: z.literal(EffectCommandField.SetEffectRemaining), id: EffectInstanceId, remaining: EffectRounds }),
  z.object({ field: z.literal(EffectCommandField.SetEffectBadge), id: EffectInstanceId, value: EffectBadgeValue }),
]);
export type EffectCommand = z.infer<typeof EffectCommandSchema>;

/** Why an effect edit is refused. */
export const EffectProblem = {
  /** The content has no such effect. */
  Unknown: 'unknown',
  /** The instance is not on the character. */
  Missing: 'missing',
  /** The character has as many effects as it can hold. */
  Full: 'full',
  /** A formula badge needs its rolled value, and an effect with a counter or no badge takes none; a counter stays within its bounds. */
  Badge: 'badge',
  /** A spell rank is cast at, which only a polymorph effect is; any other effect takes none. */
  Rank: 'rank',
} as const;
export type EffectProblem = ValueOf<typeof EffectProblem>;

function withinBounds(terms: CounterTerms, value: EffectBadgeValue): boolean {
  return (terms.min === undefined || value >= terms.min) && (terms.max === undefined || value <= terms.max);
}

/** Whether `value` is a badge the effect's terms allow it to show. */
function badgeFits(terms: EffectBadgeTerms | undefined, value: EffectBadgeValue): boolean {
  if (terms === undefined) {
    return false;
  }
  return terms.type === EffectBadgeType.Formula || withinBounds(terms, value);
}

function problemOfApply(
  effects: readonly ActiveEffect[],
  command: Extract<EffectCommand, { field: typeof EffectCommandField.ApplyEffect }>,
  content: EffectContent,
): EffectProblem | undefined {
  const terms = content.get(command.effect);
  if (terms === undefined) {
    return EffectProblem.Unknown;
  }
  const rolls = terms.badge?.type === EffectBadgeType.Formula;
  if (rolls !== (command.rolled !== undefined)) {
    return EffectProblem.Badge;
  }
  if (command.rank !== undefined && terms.polymorph !== true) {
    return EffectProblem.Rank;
  }
  return effects.length >= EFFECTS_MAX ? EffectProblem.Full : undefined;
}

/** Why `command` cannot be applied to `effects`, if it cannot. Applying a refused command changes nothing. */
export function effectProblem(
  effects: readonly ActiveEffect[],
  command: EffectCommand,
  content: EffectContent,
): EffectProblem | undefined {
  if (command.field === EffectCommandField.ApplyEffect) {
    return problemOfApply(effects, command, content);
  }
  const target = effects.find(({ id }) => id === command.id);
  if (target === undefined) {
    return EffectProblem.Missing;
  }
  if (command.field !== EffectCommandField.SetEffectBadge) {
    return undefined;
  }
  return badgeFits(content.get(target.effect)?.badge, command.value) ? undefined : EffectProblem.Badge;
}

/** The instance `command` applies, started from the terms the content gives. */
function applied(
  command: Extract<EffectCommand, { field: typeof EffectCommandField.ApplyEffect }>,
  terms: EffectTerms,
): ActiveEffect {
  const badge = terms.badge?.type === EffectBadgeType.Counter ? terms.badge.value : command.rolled;
  return {
    id: command.id,
    effect: command.effect,
    source: command.source,
    ...(terms.remaining === undefined ? {} : { remaining: terms.remaining }),
    ...(terms.expiry === undefined ? {} : { expiry: terms.expiry }),
    ...(terms.sustained ? { sustained: true } : {}),
    ...(badge === undefined ? {} : { badge }),
    ...(command.form === undefined ? {} : { form: command.form }),
    ...(command.rank === undefined ? {} : { rank: command.rank }),
    ...(command.tempHp === undefined || command.tempHp === 0 ? {} : { tempHp: command.tempHp }),
  };
}

/**
 * `effects` after `command`. One instance per id, so applying an id that is already there changes nothing; an
 * instance the command names but the character lacks, or an effect the content lacks, is left alone.
 */
export function applyEffectCommand(
  effects: readonly ActiveEffect[],
  command: EffectCommand,
  content: EffectContent,
): readonly ActiveEffect[] {
  switch (command.field) {
    case EffectCommandField.ApplyEffect: {
      const terms = content.get(command.effect);
      return terms === undefined || effects.some(({ id }) => id === command.id)
        ? effects
        : [...effects, applied(command, terms)];
    }
    case EffectCommandField.RemoveEffect: {
      return effects.filter(({ id }) => id !== command.id);
    }
    case EffectCommandField.SetEffectRemaining: {
      return effects.map((each) =>
        each.id === command.id && each.remaining !== undefined ? { ...each, remaining: command.remaining } : each,
      );
    }
    case EffectCommandField.SetEffectBadge: {
      return effects.map((each) => (each.id === command.id ? { ...each, badge: command.value } : each));
    }
    default: {
      return command satisfies never;
    }
  }
}

/** Whether `command` is one of the effect edits. */
export function isEffectCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, EffectCommand> {
  return Object.values<unknown>(EffectCommandField).includes(command.field);
}
