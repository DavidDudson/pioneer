import { applyConditionCommand, isConditionCommand } from './conditions';
import type { ConditionCommand } from './conditions';
import { applyEffectCommand, isEffectCommand } from './effect-commands';
import type { EffectCommand } from './effect-commands';
import type { ActiveEffect, EffectContent } from './effects';
import { applyResourceCommand, ResourceCommandField } from './resource-commands';
import type { ResourceCommand, ResourceLimits } from './resource-commands';
import { ResourceCount } from './resource-count';
import { applyRestCommand } from './rest-actions';
import { isRestCommand } from './rest-types';
import type { RestCommand, RestLimits, RestPlay } from './rest-types';
import { applySpendCommand, isSpendCommand } from './spend-commands';
import type { SpendLimits } from './spend-commands';
import type { SpendCommand, SpendLog } from './spend-log';
import { applyToggleCommand, isToggleCommand } from './toggle-commands';
import type { ToggleCommand, Toggles } from './toggle-commands';
import type { TurnState } from './turn-state';

/** The charges an edit spends from a staff when it is no staff cast. */
const NO_CHARGES = ResourceCount.parse(0);

/** The edits that move pools, slots and uses, change conditions, set toggles or restore resources. */
export type CountingCommand =
  | ResourceCommand
  | ConditionCommand
  | EffectCommand
  | RestCommand
  | ToggleCommand
  | SpendCommand;

/** The part of a play state a counting edit reads and writes: what a restoring action does, and the toggles. */
export type CountingPlay = RestPlay & {
  readonly toggles: Toggles;
  readonly effects: readonly ActiveEffect[];
  readonly spendLog: SpendLog;
  readonly turn: TurnState;
};

/** What a counting edit reads besides the play state: the restoring actions' limits and the effect content. */
export type CountingLimits = RestLimits & { readonly effects: EffectContent; readonly spend: SpendLimits };

/** Whether `command` is a pool, slot or use edit. */
function isResourceCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, ResourceCommand> {
  return Object.values<unknown>(ResourceCommandField).includes(command.field);
}

/** Whether `command` is one of the counting edits, so the rest of the play edits are Hit Points and the death track. */
export function isCountingCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, CountingCommand> {
  return (
    isResourceCommand(command) ||
    isConditionCommand(command) ||
    isEffectCommand(command) ||
    isRestCommand(command) ||
    isToggleCommand(command) ||
    isSpendCommand(command)
  );
}

/** What bounds a pool edit, from the limits of a counting edit. */
function resourceLimits(limits: CountingLimits): ResourceLimits {
  return { points: limits.resources, counted: limits.counted, staffCost: limits.staff.castCost ?? NO_CHARGES };
}

/** `play` after a pool, condition, toggle or restoring edit, within the limits. */
export function applyCountingCommand<Play extends CountingPlay>(
  play: Play,
  command: CountingCommand,
  limits: CountingLimits,
): Play {
  if (isRestCommand(command)) {
    return applyRestCommand(play, command, limits).play;
  }
  if (isSpendCommand(command)) {
    return { ...play, ...applySpendCommand(play, command, { ...resourceLimits(limits), ...limits.spend }) };
  }
  if (isToggleCommand(command)) {
    return { ...play, toggles: applyToggleCommand(play.toggles, command) };
  }
  if (isEffectCommand(command)) {
    return { ...play, effects: [...applyEffectCommand(play.effects, command, limits.effects)] };
  }
  if (isConditionCommand(command)) {
    return { ...play, conditions: [...applyConditionCommand(play.conditions, command)] };
  }
  return { ...play, ...applyResourceCommand(play, command, resourceLimits(limits)) };
}
