import { applyConditionCommand, isConditionCommand } from './conditions';
import type { ConditionCommand } from './conditions';
import { applyEffectCommand, isEffectCommand } from './effect-commands';
import type { EffectCommand } from './effect-commands';
import type { ActiveEffect, EffectContent } from './effects';
import { applyResourceCommand, ResourceCommandField } from './resource-commands';
import type { ResourceCommand } from './resource-commands';
import { applyRestCommand } from './rest-actions';
import { isRestCommand } from './rest-types';
import type { RestCommand, RestLimits, RestPlay } from './rest-types';
import { applyToggleCommand, isToggleCommand } from './toggle-commands';
import type { ToggleCommand, Toggles } from './toggle-commands';

/** The edits that move pools, slots and uses, change conditions, set toggles or restore resources. */
export type CountingCommand = ResourceCommand | ConditionCommand | EffectCommand | RestCommand | ToggleCommand;

/** The part of a play state a counting edit reads and writes: what a restoring action does, and the toggles. */
export type CountingPlay = RestPlay & { readonly toggles: Toggles; readonly effects: readonly ActiveEffect[] };

/** What a counting edit reads besides the play state: the restoring actions' limits and the effect content. */
export type CountingLimits = RestLimits & { readonly effects: EffectContent };

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
    isToggleCommand(command)
  );
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
  if (isToggleCommand(command)) {
    return { ...play, toggles: applyToggleCommand(play.toggles, command) };
  }
  if (isEffectCommand(command)) {
    return { ...play, effects: [...applyEffectCommand(play.effects, command, limits.effects)] };
  }
  if (isConditionCommand(command)) {
    return { ...play, conditions: [...applyConditionCommand(play.conditions, command)] };
  }
  return { ...play, ...applyResourceCommand(play, command, { points: limits.resources, counted: limits.counted }) };
}
