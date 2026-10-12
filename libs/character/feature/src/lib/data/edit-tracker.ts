import { computed, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { CharacterId, CharacterPatch } from '@pioneer/character/domain';
import type { ValueOf } from '@pioneer/shared/kernel';

/** How the open character's edits stand, for the sheet header. */
export const SaveState = {
  /** Nothing waiting: every edit made has saved, or none was made. */
  Saved: 'saved',
  Saving: 'saving',
  /** An edit failed and can be sent again. */
  Failed: 'failed',
  /** An edit lost to someone else's; their version is showing, and resending would overwrite it. */
  Conflict: 'conflict',
} as const;
export type SaveState = ValueOf<typeof SaveState>;

/** One edit sent: the character it was made on, and its place in the order edits were sent. */
export interface SentEdit {
  readonly id: CharacterId;
  readonly sequence: number;
  readonly patch: CharacterPatch;
}

/** An edit that failed, kept so the header can send it again to the character it was made on. */
export interface FailedEdit extends SentEdit {
  readonly conflict: boolean;
}

/** What an edit changes: a slot, an item, or a field of the character. A later save of the same target settles it. */
function targetOf(patch: CharacterPatch): string {
  if ('slot' in patch) {
    return `slot:${patch.slot}`;
  }
  return 'id' in patch ? `${patch.field}:${patch.id}` : patch.field;
}

/**
 * The edits in flight and the ones that failed, per character, so the header shows only the open character's and
 * Retry resends to the character an edit was made on. A failure stays until its target saves: by Retry, or by a later
 * edit of the same field, slot or item. An edit to something else leaves it showing.
 */
export class EditTracker {
  readonly #inFlight = signal<readonly SentEdit[]>([]);
  readonly #failed = signal<readonly FailedEdit[]>([]);
  /** The latest edit saved per character and target, so an older edit failing after it is already superseded. */
  readonly #lastSaved = new Map<string, number>();
  #sent = 0;
  readonly #selectedId: Signal<CharacterId | undefined>;

  public constructor(selectedId: Signal<CharacterId | undefined>) {
    this.#selectedId = selectedId;
  }

  /** The open character's latest failed edit, if any. */
  public readonly failed: Signal<FailedEdit | undefined> = computed(() =>
    this.#failed().findLast((edit) => edit.id === this.#selectedId()),
  );

  public readonly state: Signal<SaveState> = computed(() => {
    const id = this.#selectedId();
    if (this.#inFlight().some((edit) => edit.id === id)) {
      return SaveState.Saving;
    }
    const failed = this.failed();
    if (failed === undefined) {
      return SaveState.Saved;
    }
    return failed.conflict ? SaveState.Conflict : SaveState.Failed;
  });

  /** Counts `patch` to character `id` as in flight. */
  public begin(id: CharacterId, patch: CharacterPatch): SentEdit {
    this.#sent += 1;
    const edit = { id, sequence: this.#sent, patch };
    this.#inFlight.update((edits) => [...edits, edit]);
    return edit;
  }

  /** `edit` saved: earlier failures of its target on its character are settled. */
  public saved(edit: SentEdit): void {
    this.#settle(edit);
    const target = targetOf(edit.patch);
    const key = `${edit.id}|${target}`;
    this.#lastSaved.set(key, Math.max(this.#lastSaved.get(key) ?? 0, edit.sequence));
    this.#failed.update((failed) =>
      failed.filter((each) => each.id !== edit.id || each.sequence > edit.sequence || targetOf(each.patch) !== target),
    );
  }

  /**
   * `edit` failed, as a conflict or otherwise; it replaces any earlier failure of its target. A failure that a newer
   * save of the same target already overtook is dropped: that newer value is what the character holds.
   */
  public failedWith(edit: SentEdit, conflict: boolean): void {
    this.#settle(edit);
    const target = targetOf(edit.patch);
    if ((this.#lastSaved.get(`${edit.id}|${target}`) ?? 0) > edit.sequence) {
      return;
    }
    this.#failed.update((failed) => [
      ...failed.filter((each) => each.id !== edit.id || targetOf(each.patch) !== target),
      { ...edit, conflict },
    ]);
  }

  #settle(edit: SentEdit): void {
    this.#inFlight.update((edits) => edits.filter((each) => each !== edit));
  }
}
