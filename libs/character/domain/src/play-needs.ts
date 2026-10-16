import { isEffectCommand } from './effect-commands';
import { isExplorationCommand } from './exploration-commands';
import { PlayCommandField } from './play-state';
import type { PlayCommand } from './play-state';
import { isRestCommand } from './rest-types';
import { isSpendCommand } from './spend-commands';
import { isToggleCommand } from './toggle-commands';

/** Whether `command` reads or moves Hit Points, and so needs the maximum the engine derives. Temp Hit Points and the death track don't. */
// oxlint-disable-next-line complexity -- a case for each play command, with the toggle edit told apart first
export function needsMaxHitPoints(command: PlayCommand): boolean {
  if (isRestCommand(command)) {
    return command.field === PlayCommandField.Rest;
  }
  if (
    isToggleCommand(command) ||
    isEffectCommand(command) ||
    isSpendCommand(command) ||
    isExplorationCommand(command)
  ) {
    return false;
  }
  switch (command.field) {
    case PlayCommandField.Damage:
    case PlayCommandField.BlockWithShield:
    case PlayCommandField.Heal:
    case PlayCommandField.SetHp: {
      return true;
    }
    case PlayCommandField.SetTempHp:
    case PlayCommandField.RecoveryCheck:
    case PlayCommandField.SetDying:
    case PlayCommandField.SetWounded:
    case PlayCommandField.SetDoomed:
    case PlayCommandField.SpendResource:
    case PlayCommandField.RegainResource:
    case PlayCommandField.SetResource:
    case PlayCommandField.SpendSlot:
    case PlayCommandField.RefundSlot:
    case PlayCommandField.AddCondition:
    case PlayCommandField.SetConditionValue:
    case PlayCommandField.RemoveCondition:
    case PlayCommandField.SpendUse:
    case PlayCommandField.RefundUse:
    case PlayCommandField.CastWand:
    case PlayCommandField.OverchargeWand:
    case PlayCommandField.CastStaff:
    case PlayCommandField.UncastStaff: {
      return false;
    }
    default: {
      return command satisfies never;
    }
  }
}

/** Whether `command` moves a pool of points, and so needs the maxima the build and the rules give. */
// oxlint-disable-next-line complexity -- a case for each play command, with the toggle edit told apart first
export function needsResourceMaxima(command: PlayCommand): boolean {
  if (isRestCommand(command)) {
    return true;
  }
  if (isSpendCommand(command)) {
    return true;
  }
  if (
    isToggleCommand(command) ||
    isEffectCommand(command) ||
    isSpendCommand(command) ||
    isExplorationCommand(command)
  ) {
    return false;
  }
  switch (command.field) {
    case PlayCommandField.SpendResource:
    case PlayCommandField.RegainResource:
    case PlayCommandField.SetResource:
    case PlayCommandField.SpendSlot:
    case PlayCommandField.RefundSlot:
    case PlayCommandField.SpendUse:
    case PlayCommandField.RefundUse:
    case PlayCommandField.CastWand:
    case PlayCommandField.OverchargeWand:
    case PlayCommandField.CastStaff:
    case PlayCommandField.UncastStaff: {
      return true;
    }
    case PlayCommandField.Damage:
    case PlayCommandField.BlockWithShield:
    case PlayCommandField.Heal:
    case PlayCommandField.SetHp:
    case PlayCommandField.SetTempHp:
    case PlayCommandField.RecoveryCheck:
    case PlayCommandField.SetDying:
    case PlayCommandField.SetWounded:
    case PlayCommandField.AddCondition:
    case PlayCommandField.SetConditionValue:
    case PlayCommandField.RemoveCondition:
    case PlayCommandField.SetDoomed: {
      return false;
    }
    default: {
      return command satisfies never;
    }
  }
}

/** Whether `command` adds or changes a condition, and so needs to know which conditions the content has and which carry a value. */
// oxlint-disable-next-line complexity -- a case for each play command, with the toggle edit told apart first
export function needsConditionContent(command: PlayCommand): boolean {
  if (
    isRestCommand(command) ||
    isToggleCommand(command) ||
    isEffectCommand(command) ||
    isSpendCommand(command) ||
    isExplorationCommand(command)
  ) {
    return false;
  }
  switch (command.field) {
    case PlayCommandField.AddCondition:
    case PlayCommandField.SetConditionValue: {
      return true;
    }
    case PlayCommandField.RemoveCondition:
    case PlayCommandField.Damage:
    case PlayCommandField.BlockWithShield:
    case PlayCommandField.Heal:
    case PlayCommandField.SetHp:
    case PlayCommandField.SetTempHp:
    case PlayCommandField.RecoveryCheck:
    case PlayCommandField.SetDying:
    case PlayCommandField.SetWounded:
    case PlayCommandField.SetDoomed:
    case PlayCommandField.SpendResource:
    case PlayCommandField.RegainResource:
    case PlayCommandField.SetResource:
    case PlayCommandField.SpendSlot:
    case PlayCommandField.RefundSlot:
    case PlayCommandField.SpendUse:
    case PlayCommandField.RefundUse:
    case PlayCommandField.CastWand:
    case PlayCommandField.OverchargeWand:
    case PlayCommandField.CastStaff:
    case PlayCommandField.UncastStaff: {
      return false;
    }
    default: {
      return command satisfies never;
    }
  }
}

/** Whether `command` is Rest, and so needs the healing and the conditions it eases from the build and the content. */
export function needsRestContent(command: PlayCommand): boolean {
  return command.field === PlayCommandField.Rest;
}

/** Whether `command` applies an effect, or changes the badge of one, and so needs the effects the content has. */
export function needsEffectContent(command: PlayCommand): boolean {
  return (
    isEffectCommand(command) &&
    (command.field === PlayCommandField.ApplyEffect || command.field === PlayCommandField.SetEffectBadge)
  );
}
