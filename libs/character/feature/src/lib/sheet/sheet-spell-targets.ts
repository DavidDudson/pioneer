import { TargetValue } from '@pioneer/rules/sdk';
import type { SpellDetailLine } from '@pioneer/rules/ui';

/** Which spells the sheet's lists show by what they target (#484): every one, those with one target, or those with several. */
export const SpellTargetFilter = {
  All: 'all',
  Single: 'single',
  Multiple: 'multiple',
} as const;
export type SpellTargetFilter = (typeof SpellTargetFilter)[keyof typeof SpellTargetFilter];

/** The message key each filter reads as. */
export const SPELL_TARGET_FILTER_MESSAGES: Readonly<Record<SpellTargetFilter, string>> = {
  [SpellTargetFilter.All]: 'character.sheet.spellTargets.all',
  [SpellTargetFilter.Single]: 'character.sheet.spellTargets.single',
  [SpellTargetFilter.Multiple]: 'character.sheet.spellTargets.multiple',
};

const TARGET_OF_FILTER: Readonly<Record<Exclude<SpellTargetFilter, 'all'>, TargetValue>> = {
  [SpellTargetFilter.Single]: TargetValue.Single,
  [SpellTargetFilter.Multiple]: TargetValue.Multiple,
};

/** Whether a spell passes `filter`; a slot with no spell yet always does, so it can still be picked. */
export function passesTargetFilter(detail: SpellDetailLine | undefined, filter: SpellTargetFilter): boolean {
  return (
    filter === SpellTargetFilter.All || detail === undefined || detail.targetValues.includes(TARGET_OF_FILTER[filter])
  );
}
