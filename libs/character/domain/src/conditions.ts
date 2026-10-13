import type { GrantRoot } from '@pioneer/rules/grants';
import { ConditionValue, ContentId, ContentKind, EventRef, OriginHopKind } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { Pg, Uuid } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** The most conditions a character holds at once, however many sources they come from. */
const CONDITIONS_MAX = 64;

/** One condition on a character, apart from its content: an instance may be removed or changed on its own. */
export const ConditionInstanceId = Uuid.brand<'ConditionInstanceId'>();
export type ConditionInstanceId = z.infer<typeof ConditionInstanceId>;

/** A count of rounds a condition lasts. */
export const ConditionRounds = Pg.smallint().positive().brand<'ConditionRounds'>();
export type ConditionRounds = z.infer<typeof ConditionRounds>;

/** How long a condition lasts: for a number of rounds, to a point in a turn, until removed, or while sustained. */
export const ConditionDurationKind = {
  Rounds: 'rounds',
  UntilStartOfTurn: 'untilStartOfTurn',
  UntilEndOfTurn: 'untilEndOfTurn',
  Unlimited: 'unlimited',
  Sustained: 'sustained',
} as const;
export type ConditionDurationKind = ValueOf<typeof ConditionDurationKind>;

const ConditionDurationSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal(ConditionDurationKind.Rounds), rounds: ConditionRounds }),
  z.strictObject({ kind: z.literal(ConditionDurationKind.UntilStartOfTurn) }),
  z.strictObject({ kind: z.literal(ConditionDurationKind.UntilEndOfTurn) }),
  z.strictObject({ kind: z.literal(ConditionDurationKind.Unlimited) }),
  z.strictObject({ kind: z.literal(ConditionDurationKind.Sustained) }),
]);
export type ConditionDuration = z.infer<typeof ConditionDurationSchema>;

/** Until someone removes it. */
export const UNLIMITED: ConditionDuration = { kind: ConditionDurationKind.Unlimited };

/**
 * A condition active on a character, as an input: which condition, its value when it is valued, how long it lasts and
 * the campaign event that applied it. Its effect on statistics is the content's, worked out on every read.
 */
export const ActiveConditionSchema = z.strictObject({
  id: ConditionInstanceId,
  condition: ContentId,
  value: ConditionValue.optional(),
  duration: ConditionDurationSchema.default(UNLIMITED),
  appliedBy: EventRef.optional(),
});
export type ActiveCondition = z.infer<typeof ActiveConditionSchema>;

export const ActiveConditionsSchema = z.array(ActiveConditionSchema).max(CONDITIONS_MAX).default([]);

/** The play edits that add, change and remove conditions. */
export const ConditionCommandField = {
  AddCondition: 'addCondition',
  SetConditionValue: 'setConditionValue',
  RemoveCondition: 'removeCondition',
} as const;
export type ConditionCommandField = ValueOf<typeof ConditionCommandField>;

export const ConditionCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(ConditionCommandField.AddCondition), condition: ActiveConditionSchema }),
  z.object({
    field: z.literal(ConditionCommandField.SetConditionValue),
    id: ConditionInstanceId,
    value: ConditionValue,
  }),
  z.object({ field: z.literal(ConditionCommandField.RemoveCondition), id: ConditionInstanceId }),
]);
export type ConditionCommand = z.infer<typeof ConditionCommandSchema>;

/** Whether each condition the content has carries a value, by id. */
export type ConditionValued = ReadonlyMap<ContentId, boolean>;

/** Why a condition edit is refused. */
export const ConditionProblem = {
  /** The content has no such condition. */
  Unknown: 'unknown',
  /** A valued condition needs a value, and a condition that has none takes none. */
  Value: 'value',
  /** The instance is not on the character. */
  Missing: 'missing',
  /** The character holds as many conditions as it can. */
  Full: 'full',
} as const;
export type ConditionProblem = ValueOf<typeof ConditionProblem>;

function problemOfAdd(
  conditions: readonly ActiveCondition[],
  added: ActiveCondition,
  valued: ConditionValued,
): ConditionProblem | undefined {
  const isValued = valued.get(added.condition);
  if (isValued === undefined) {
    return ConditionProblem.Unknown;
  }
  if (isValued !== (added.value !== undefined)) {
    return ConditionProblem.Value;
  }
  return conditions.length >= CONDITIONS_MAX ? ConditionProblem.Full : undefined;
}

/** Why `command` cannot be applied to `conditions`, if it cannot. Applying a refused command changes nothing. */
export function conditionProblem(
  conditions: readonly ActiveCondition[],
  command: ConditionCommand,
  valued: ConditionValued,
): ConditionProblem | undefined {
  switch (command.field) {
    case ConditionCommandField.AddCondition: {
      return problemOfAdd(conditions, command.condition, valued);
    }
    case ConditionCommandField.SetConditionValue: {
      const target = conditions.find(({ id }) => id === command.id);
      if (target === undefined) {
        return ConditionProblem.Missing;
      }
      return valued.get(target.condition) === true ? undefined : ConditionProblem.Value;
    }
    case ConditionCommandField.RemoveCondition: {
      return conditions.some(({ id }) => id === command.id) ? undefined : ConditionProblem.Missing;
    }
    default: {
      return command satisfies never;
    }
  }
}

/**
 * `conditions` after `command`. One instance per id, so adding an id that is already there changes nothing; an
 * instance the command names but the character lacks is left alone.
 */
export function applyConditionCommand(
  conditions: readonly ActiveCondition[],
  command: ConditionCommand,
): readonly ActiveCondition[] {
  switch (command.field) {
    case ConditionCommandField.AddCondition: {
      const { condition } = command;
      return conditions.some(({ id }) => id === condition.id) ? conditions : [...conditions, condition];
    }
    case ConditionCommandField.SetConditionValue: {
      return conditions.map((each) => (each.id === command.id ? { ...each, value: command.value } : each));
    }
    case ConditionCommandField.RemoveCondition: {
      return conditions.filter(({ id }) => id !== command.id);
    }
    default: {
      return command satisfies never;
    }
  }
}

/**
 * The conditions as roots of the effective set, each behind a condition hop that names its value and the event that
 * applied it. Two instances of one condition (frightened 2 and frightened 1) are two roots; the grants keep the
 * highest value, so the character has the condition once.
 */
export function conditionRoots(conditions: readonly ActiveCondition[]): readonly GrantRoot[] {
  return conditions.map(({ condition, value, appliedBy }) => ({
    entry: condition,
    hop: {
      kind: OriginHopKind.Condition,
      condition,
      ...(value === undefined ? {} : { value }),
      ...(appliedBy === undefined ? {} : { appliedBy }),
    },
  }));
}

/** Whether each condition of the registry's packs carries a value, by id; the last pack's entry wins, as in the registry. */
export function conditionValued(registry: ContentRegistry): ConditionValued {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  return new Map(
    entries.flatMap((entry) => (entry.kind === ContentKind.Condition ? [[entry.id, entry.data.valued] as const] : [])),
  );
}

/** Whether `command` is one of the condition edits. */
export function isConditionCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, ConditionCommand> {
  switch (command.field) {
    case ConditionCommandField.AddCondition:
    case ConditionCommandField.SetConditionValue:
    case ConditionCommandField.RemoveCondition: {
      return true;
    }
    default: {
      return false;
    }
  }
}
