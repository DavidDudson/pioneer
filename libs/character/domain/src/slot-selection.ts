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
  /** Move a signature pick that held the pick replaced even when this is not a counted swap (a retraining). */
  readonly movesSignature?: true;
}

/** Emptying `slot`; `countsAsSwap` when it is the level's repertoire swap. */
export interface ClearEdit {
  readonly slot: SlotKey;
  readonly countsAsSwap: boolean;
}

/** The document with `value` picked in `slot`; a counted swap is recorded, and moves a signature pick on the old spell. */
export function withSelection(
  document: CharacterDocument,
  { slot, value, countsAsSwap, movesSignature }: SelectionEdit,
): CharacterDocument {
  const { build } = document;
  const choices: Record<SlotKey, ChoiceValue> = { ...build.choices, [slot]: value };
  const old = build.choices[slot];

  const signature = signatureKeyOf(slot);

  const movesPick = old !== undefined && (countsAsSwap || movesSignature === true);

  if (movesPick && signature !== undefined && choices[signature] === old) {
    choices[signature] = value;
  }

  const placed = { ...withoutPlacedPick(build, slot, value), choices };

  if (!countsAsSwap || old === undefined) {
    return { ...document, build: placed };
  }

  return { ...document, build: { ...placed, repertoireSwaps: swapped(document, slot) } };
}

/** The document without a selection for `slot`; every other pick, shown or hidden, stays. */
export function withoutSelection(document: CharacterDocument, { slot, countsAsSwap }: ClearEdit): CharacterDocument {
  const { build } = document;
  const { [slot]: _cleared, ...choices } = build.choices;
  const repertoireSwaps = countsAsSwap ? swapped(document, slot) : build.repertoireSwaps;

  return { ...document, build: { ...build, choices, repertoireSwaps } };
}
