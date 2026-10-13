import { applyConditionCommand, isConditionCommand } from './conditions';
import type { ConditionCommand } from './conditions';
import { applyResourceCommand, ResourceCommandField } from './resource-commands';
import type { ResourceCommand } from './resource-commands';
import { applyRestCommand } from './rest-actions';
import { isRestCommand } from './rest-types';
import type { RestCommand, RestLimits, RestPlay } from './rest-types';

/** The edits that move pools, slots and uses, change conditions or restore resources. */
export type CountingCommand = ResourceCommand | ConditionCommand | RestCommand;

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
  return isResourceCommand(command) || isConditionCommand(command) || isRestCommand(command);
}

/** `play` after a pool, condition or restoring edit, within the limits. */
export function applyCountingCommand<Play extends RestPlay>(
  play: Play,
  command: CountingCommand,
  limits: RestLimits,
): Play {
  if (isRestCommand(command)) {
    return applyRestCommand(play, command, limits).play;
  }
  if (isConditionCommand(command)) {
    return { ...play, conditions: [...applyConditionCommand(play.conditions, command)] };
  }
  return { ...play, ...applyResourceCommand(play, command, { points: limits.resources, counted: limits.counted }) };
}
