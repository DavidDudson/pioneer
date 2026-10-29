import { applyActiveSpellCommand, isActiveSpellCommand } from './active-spells';
import type { ActiveSpell, ActiveSpellCommand } from './active-spells';
import { applyBreathCommand, breathRestored, isBreathCommand } from './breath';
import type { BreathCommand, BreathState } from './breath';
import { applyConditionCommand, ConditionCommandField, isConditionCommand } from './conditions';
import type { ConditionCommand } from './conditions';
import { isEffectCommand } from './effect-commands';
import type { EffectCommand } from './effect-commands';
import { applyEffectEdit } from './effect-ending';
import type { ActiveEffect, EffectContent } from './effects';
import { exposureAfterCommand } from './environment-exposure';
import type { Exposure } from './environment-exposure';
import { applyEnvironmentCommand, displacedBy, isEnvironmentCommand } from './environments';
import type { ActiveEnvironments, EnvironmentCommand, EnvironmentGroups } from './environments';
import { applyExplorationCommand, isExplorationCommand } from './exploration-commands';
import type { ExplorationActivity, ExplorationCommand } from './exploration-commands';
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
  | ActiveSpellCommand
  | RestCommand
  | ToggleCommand
  | SpendCommand
  | ExplorationCommand
  | EnvironmentCommand
  | BreathCommand;

/** The part of a play state a counting edit reads and writes: what a restoring action does, and the toggles. */
export type CountingPlay = RestPlay & {
  readonly toggles: Toggles;
  readonly effects: readonly ActiveEffect[];
  readonly environments: ActiveEnvironments;
  readonly exposure: Exposure;
  readonly breath?: BreathState | undefined;
  readonly activeSpells: readonly ActiveSpell[];
  readonly spendLog: SpendLog;
  readonly turn: TurnState;
  readonly exploration?: ExplorationActivity;
};

/** What a counting edit reads besides the play state: the restoring actions' limits and the effect content. */
export type CountingLimits = RestLimits & {
  readonly effects: EffectContent;
  readonly environmentGroups: EnvironmentGroups;
  readonly spend: SpendLimits;
};

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
    isSpendCommand(command) ||
    isActiveSpellCommand(command) ||
    isExplorationCommand(command) ||
    isEnvironmentCommand(command) ||
    isBreathCommand(command)
  );
}

/** What bounds a pool edit, from the limits of a counting edit. */
function resourceLimits(limits: CountingLimits): ResourceLimits {
  return { points: limits.resources, counted: limits.counted, staffCost: limits.staff.castCost ?? NO_CHARGES };
}

/** `play` after an environment is turned on or off; turning one on turns off the others of its group. */
function applyEnvironmentSet<Play extends CountingPlay>(
  play: Play,
  command: EnvironmentCommand,
  groups: EnvironmentGroups,
): Play {
  let { environments, exposure } = play;
  const turnedOff = command.active ? displacedBy(environments, groups, command.environment) : [];
  for (const environment of turnedOff) {
    const off: EnvironmentCommand = { field: command.field, environment, active: false };
    environments = applyEnvironmentCommand(environments, off);
    exposure = exposureAfterCommand(exposure, off);
  }
  return {
    ...play,
    environments: applyEnvironmentCommand(environments, command),
    exposure: exposureAfterCommand(exposure, command),
  };
}

/** `play` after a toggle or an environment set, or the exploration activity chosen. */
function applyChoiceCommand<Play extends CountingPlay>(
  play: Play,
  command: ToggleCommand | ExplorationCommand | EnvironmentCommand | BreathCommand,
  groups: EnvironmentGroups,
): Play {
  if (isExplorationCommand(command)) {
    return { ...play, exploration: applyExplorationCommand(command) };
  }
  if (isBreathCommand(command)) {
    const ended = breathRestored(command, play.breath);
    const conditions =
      ended === undefined
        ? play.conditions
        : applyConditionCommand(play.conditions, { field: ConditionCommandField.RemoveCondition, id: ended });
    return { ...play, breath: applyBreathCommand(command, play.breath), conditions: [...conditions] };
  }
  if (isEnvironmentCommand(command)) {
    return applyEnvironmentSet(play, command, groups);
  }
  return { ...play, toggles: applyToggleCommand(play.toggles, command) };
}

/** `play` after an edit of its active effects or active spells. */
function applyListCommand<Play extends CountingPlay>(
  play: Play,
  command: EffectCommand | ActiveSpellCommand,
  limits: CountingLimits,
): Play {
  return isActiveSpellCommand(command)
    ? { ...play, activeSpells: [...applyActiveSpellCommand(play.activeSpells, command)] }
    : applyEffectEdit(play, command, limits.effects);
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
  if (
    isToggleCommand(command) ||
    isExplorationCommand(command) ||
    isEnvironmentCommand(command) ||
    isBreathCommand(command)
  ) {
    return applyChoiceCommand(play, command, limits.environmentGroups);
  }
  if (isEffectCommand(command) || isActiveSpellCommand(command)) {
    return applyListCommand(play, command, limits);
  }
  if (isConditionCommand(command)) {
    return { ...play, conditions: [...applyConditionCommand(play.conditions, command)] };
  }
  return { ...play, ...applyResourceCommand(play, command, resourceLimits(limits)) };
}
