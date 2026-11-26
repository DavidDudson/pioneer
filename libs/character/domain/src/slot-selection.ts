import type { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';

import type { Build, CharacterDocument } from './character-document';
import { signatureKeyOf } from './signature-spells';
import { withoutPlacedPick } from './unplaced-picks';

/** The swaps with `slot` recorded at the character's level. */
function swapped(document: CharacterDocument, slot: SlotKey): Build['repertoireSwaps'] {
  const { level, build } = document;

  return [...build.repertoireSwaps.filter((each) => each.level !== level), { level, slot }];
}

/** Picking `value` in `slot`; `countsAsSwap` when it is the level's repertoire swap. */
export interface SelectionEdit {
  readonly slot: SlotKey;
  readonly value: ChoiceValue;
  readonly countsAsSwap: boolean;
}

/** Emptying `slot`; `countsAsSwap` when it is the level's repertoire swap. */
export interface ClearEdit {
  readonly slot: SlotKey;
  readonly countsAsSwap: boolean;
}

/**
 * The document with `value` picked in `slot`. A pick that is the level's repertoire swap (`countsAsSwap`) is recorded
 * as it, and moves a signature pick that held the spell swapped out.
 */
export function withSelection(
  document: CharacterDocument,
  { slot, value, countsAsSwap }: SelectionEdit,
): CharacterDocument {
  const { build } = document;
  const choices: Record<SlotKey, ChoiceValue> = { ...build.choices, [slot]: value };
  const old = build.choices[slot];

  if (!countsAsSwap || old === undefined) {
    return { ...document, build: { ...withoutPlacedPick(build, slot, value), choices } };
  }

  const signature = signatureKeyOf(slot);

  if (signature !== undefined && choices[signature] === old) {
    choices[signature] = value;
  }

  const recorded = { ...withoutPlacedPick(build, slot, value), choices, repertoireSwaps: swapped(document, slot) };

  return { ...document, build: recorded };
}

/** The document without a selection for `slot`; every other pick, shown or hidden, stays. */
export function withoutSelection(document: CharacterDocument, { slot, countsAsSwap }: ClearEdit): CharacterDocument {
  const { build } = document;
  const { [slot]: _cleared, ...choices } = build.choices;
  const repertoireSwaps = countsAsSwap ? swapped(document, slot) : build.repertoireSwaps;

  return { ...document, build: { ...build, choices, repertoireSwaps } };
}
