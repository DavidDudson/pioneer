import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { CharacterId, CharacterName, CharacterPatchField } from '@pioneer/character/domain';
import type { CharacterPatch } from '@pioneer/character/domain';
import { SlotKey } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { EditTracker, SaveState } from './edit-tracker';

const KYRA = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');
const SEELAH = CharacterId.parse('1d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');

function rename(name: string): CharacterPatch {
  return { field: CharacterPatchField.Name, value: CharacterName.parse(name) };
}

function clearSlot(slot: string): CharacterPatch {
  return { field: CharacterPatchField.ClearSlot, slot: SlotKey.parse(slot) };
}

interface Tracked {
  readonly edits: EditTracker;
  /** The open character. */
  readonly open: WritableSignal<CharacterId>;
}

function tracker(): Tracked {
  const open = signal(KYRA);
  return { edits: new EditTracker(open), open };
}

describe(EditTracker, () => {
  it('is saving while an edit to the open character is in flight, then saved', () => {
    const { edits } = tracker();
    const edit = edits.begin(KYRA, rename('Kyra'));
    expect(edits.state()).toBe(SaveState.Saving);
    edits.saved(edit);
    expect(edits.state()).toBe(SaveState.Saved);
  });

  it('keeps a failure until its target saves, whatever else saves meanwhile', () => {
    const { edits } = tracker();
    const failed = edits.begin(KYRA, rename('Kyra'));
    const other = edits.begin(KYRA, clearSlot('background'));
    edits.failedWith(failed, false);
    edits.saved(other);
    expect(edits.state()).toBe(SaveState.Failed);
    expect(edits.failed()?.patch).toStrictEqual(rename('Kyra'));

    edits.saved(edits.begin(KYRA, rename('Kyra')));
    expect(edits.state()).toBe(SaveState.Saved);
  });

  it('marks a lost edit as a conflict', () => {
    const { edits } = tracker();
    edits.failedWith(edits.begin(KYRA, rename('Kyra')), true);
    expect(edits.state()).toBe(SaveState.Conflict);
  });

  it("never shows another character's edits, in flight or failed", () => {
    const { edits, open } = tracker();
    const pending = edits.begin(KYRA, rename('Kyra'));
    open.set(SEELAH);
    expect(edits.state()).toBe(SaveState.Saved);
    edits.failedWith(pending, false);
    expect(edits.state()).toBe(SaveState.Saved);
    expect(edits.failed()).toBeUndefined();

    open.set(KYRA);
    expect(edits.failed()?.id).toBe(KYRA);
  });
});
