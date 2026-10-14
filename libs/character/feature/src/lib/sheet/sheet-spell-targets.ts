import { TargetValue } from '@pioneer/rules/sdk';
import type { FocusLine, SpellDetailLine } from '@pioneer/rules/ui';

import type { PreparedEntryFields } from './sheet-spell-picks';

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

/** The prepared entries with only the slots that pass `filter`, and no rank or entry left without one. */
export function filterPrepared(
  entries: readonly PreparedEntryFields[],
  filter: SpellTargetFilter,
): readonly PreparedEntryFields[] {
  return filter === SpellTargetFilter.All
    ? entries
    : entries
        .map((entry) => ({
          ...entry,
          ranks: entry.ranks
            .map((rank) => ({
              ...rank,
              fields: rank.fields.filter((slot) => passesTargetFilter(slot.detail(), filter)),
            }))
            .filter((rank) => rank.fields.length > 0),
        }))
        .filter((entry) => entry.ranks.length > 0);
}

/** The focus spells that pass `filter`; a focus spell not worded yet always does. */
export function filterFocus(focus: FocusLine, filter: SpellTargetFilter): FocusLine {
  return filter === SpellTargetFilter.All
    ? focus
    : {
        ...focus,
        entries: focus.entries
          .map((entry) => ({
            ...entry,
            spells: entry.spells.filter((spell) => passesTargetFilter(spell.detail, filter)),
          }))
          .filter((entry) => entry.spells.length > 0),
      };
}
