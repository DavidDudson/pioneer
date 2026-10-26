import {
  conditionProblem,
  ConditionProblem,
  EffectCommandField,
  environmentContent,
  EffectProblem,
  effectProblem,
  isConditionCommand,
  isConsumableCommand,
  isEffectCommand,
  isEnvironmentCommand,
  isExplorationActivity,
  isExplorationCommand,
  PlayCommandField,
  SELF,
  StaffProblem,
  staffProblem,
} from '@pioneer/character/domain';
import type {
  ConditionValued,
  EffectCommand,
  EffectContent,
  PlayCommand,
  PlayEdit,
  PlayState,
  StaffLimits,
} from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';

/** The message each refused effect edit answers with. */
const EFFECT_MESSAGES = {
  [EffectProblem.Unknown]: 'character.validation.effectUnknown',
  [EffectProblem.Missing]: 'character.validation.effectMissing',
  [EffectProblem.Full]: 'character.validation.effectFull',
  [EffectProblem.Badge]: 'character.validation.effectBadge',
} as const satisfies Record<EffectProblem, string>;

/** The message each refused condition edit answers with. */
const CONDITION_MESSAGES = {
  [ConditionProblem.Unknown]: 'character.validation.conditionUnknown',
  [ConditionProblem.Value]: 'character.validation.conditionValue',
  [ConditionProblem.Missing]: 'character.validation.conditionMissing',
  [ConditionProblem.Full]: 'character.validation.conditionFull',
} as const satisfies Record<ConditionProblem, string>;

/** Refuses a condition edit the content or the character's conditions rule out. */
export function checkCondition(play: PlayState, command: PlayCommand, valued: ConditionValued): void {
  const problem = isConditionCommand(command) ? conditionProblem(play.conditions, command, valued) : undefined;
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['command'], message: message(CONDITION_MESSAGES[problem]) }]);
  }
}

/** The message each refused staff choice answers with. */
const STAFF_MESSAGES = {
  [StaffProblem.NotAStaff]: 'character.validation.staffNotHeld',
  [StaffProblem.SlotWithoutStaff]: 'character.validation.staffSlotWithoutStaff',
  [StaffProblem.SlotNotExpendable]: 'character.validation.staffSlotNotExpendable',
} as const satisfies Record<StaffProblem, string>;

/** Daily preparations, the only edit that prepares a staff. */
type DailyPreparations = Extract<PlayCommand, { readonly field: typeof PlayCommandField.DailyPreparations }>;

/** Whether `command` is daily preparations, the only edit that prepares a staff. */
export function isDailyPreparations(command: PlayCommand): command is DailyPreparations {
  return command.field === PlayCommandField.DailyPreparations;
}

/** Refuses a daily preparations that names a staff the character doesn't have, or a slot it can't expend. */
export function checkStaff(command: PlayCommand, staff: StaffLimits): void {
  const problem = isDailyPreparations(command) ? staffProblem(command, staff) : undefined;
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['command'], message: message(STAFF_MESSAGES[problem]) }]);
  }
}

/** The effect a consumable puts on the character, as the edit that applies it; undefined for any other command. */
function consumableEffect(command: PlayCommand): EffectCommand | undefined {
  return isConsumableCommand(command) && command.effect !== undefined
    ? { field: EffectCommandField.ApplyEffect, ...command.effect, source: SELF }
    : undefined;
}

/** Refuses an effect edit the content or the character's effects rule out. */
export function checkEffect(play: PlayState, command: PlayCommand, content: EffectContent): void {
  const edit = consumableEffect(command) ?? command;
  const problem = isEffectCommand(edit) ? effectProblem(play.effects, edit, content) : undefined;
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['command'], message: message(EFFECT_MESSAGES[problem]) }]);
  }
}

/** Refuses an exploration activity that is not an exploration action of the character's content. */
export async function checkExploration(command: PlayEdit, registry: () => Promise<ContentRegistry>): Promise<void> {
  const activity = isExplorationCommand(command) ? command.activity : undefined;
  if (activity === undefined) {
    return;
  }
  const content = await registry();
  if (!isExplorationActivity(content, activity)) {
    throw new ValidationError([
      { path: ['command', 'activity'], message: message('character.validation.explorationUnknown') },
    ]);
  }
}

/** Refuses turning on an environment the character's content does not have; turning one off is always allowed. */
export async function checkEnvironment(command: PlayEdit, registry: () => Promise<ContentRegistry>): Promise<void> {
  if (!isEnvironmentCommand(command) || !command.active) {
    return;
  }
  const content = environmentContent(await registry());
  if (!content.has(command.environment)) {
    throw new ValidationError([
      { path: ['command', 'environment'], message: message('character.validation.environmentUnknown') },
    ]);
  }
}
