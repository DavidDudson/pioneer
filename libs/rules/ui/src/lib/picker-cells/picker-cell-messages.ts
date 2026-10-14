import { ActionCost } from '@pioneer/rules/sdk';

import { ACTION_COST_MESSAGES } from '../rich-text/rich-text-messages';
import type { ActionCostMessages } from '../rich-text/rich-text-messages';

/** Message keys the picker cells render with, spelled out so the key check sees them. */
export const PickerCellMessage = {
  Level: 'rules.pickerCell.level',
  PrerequisiteMet: 'rules.pickerCell.prerequisite.met',
  PrerequisiteUnmet: 'rules.pickerCell.prerequisite.unmet',
  PrerequisiteUnknown: 'rules.pickerCell.prerequisite.unknown',
  BoostOr: 'rules.pickerCell.boost.or',
  BoostFree: 'rules.pickerCell.boost.free',
  Per: 'rules.pickerCell.per',
  Count: 'rules.pickerCell.count',
  None: 'rules.pickerCell.none',
} as const;

/** The costs a rich text mark has, plus a cost that varies and none at all. */
export const ActionKind = { ...ActionCost, Variable: 'variable', Time: 'time', Passive: 'passive' } as const;
export type ActionKind = (typeof ActionKind)[keyof typeof ActionKind];

/** Each cost's glyph and the words a screen reader says in its place. */
export const ACTION_KIND_MESSAGES: Readonly<Record<ActionKind, ActionCostMessages>> = {
  ...ACTION_COST_MESSAGES,
  [ActionKind.Variable]: {
    label: 'rules.pickerCell.action.variable.label',
    glyph: 'rules.pickerCell.action.variable.glyph',
  },
  [ActionKind.Time]: {
    label: 'rules.pickerCell.action.time.label',
    glyph: 'rules.pickerCell.action.time.glyph',
  },
  [ActionKind.Passive]: {
    label: 'rules.pickerCell.action.passive.label',
    glyph: 'rules.pickerCell.action.passive.glyph',
  },
};
