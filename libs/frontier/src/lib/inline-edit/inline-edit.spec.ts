import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { InlineEdit, InlineEditStatus, REVERT_WINDOW_MS, SAVE_DEBOUNCE_MS } from './inline-edit';

class ConflictError extends Error {
  public override readonly name = 'ConflictError';
}

interface Harness {
  readonly source: WritableSignal<number | undefined>;
  readonly edit: InlineEdit<number>;
  readonly save: ReturnType<typeof vi.fn<(value: number) => Promise<void>>>;
}

/** A save that behaves like the store: on success the source becomes the saved value. */
function setup(fail?: () => Error): Harness {
  const source = signal<number | undefined>(undefined);
  const save = vi.fn<(value: number) => Promise<void>>(async (value) => {
    if (fail !== undefined) {
      throw fail();
    }
    source.set(value);
  });
  const edit = new InlineEdit<number>({
    source,
    empty: 0,
    schema: z.number().int().min(1).max(20),
    save,
    isConflict: (error): boolean => error instanceof ConflictError,
  });
  return { source, edit, save };
}

function opened(fail?: () => Error): Harness {
  const harness = setup(fail);
  harness.source.set(3);
  harness.edit.edit();
  return harness;
}

describe(InlineEdit, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loading', () => {
    it('is loading until the source has a value, and cannot be opened', () => {
      const { source, edit } = setup();
      expect(edit.status()).toBe(InlineEditStatus.Loading);
      edit.edit();
      expect(edit.open()).toBe(false);
      source.set(3);
      expect(edit.status()).toBe(InlineEditStatus.Idle);
      expect(edit.display()).toBe('3');
    });
  });

  describe('autosave', () => {
    it('saves once input has been quiet for the debounce', async () => {
      const { edit, save } = opened();
      edit.change(4);
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS - 1);
      edit.change(5);
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS - 1);
      expect(save).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(save).toHaveBeenCalledExactlyOnceWith(5);
      expect(edit.status()).toBe(InlineEditStatus.Success);
    });

    it('goes saving → saved', async () => {
      const gate = Promise.withResolvers<undefined>();
      const { edit, save } = opened();
      save.mockImplementationOnce(async (): Promise<void> => {
        await gate.promise;
      });
      edit.change(4);
      const pending = edit.flush();
      expect(edit.status()).toBe(InlineEditStatus.Pending);
      expect(edit.busy()).toBe(true);
      gate.resolve(undefined);
      await pending;
      expect(edit.status()).toBe(InlineEditStatus.Success);
    });

    it('never saves a draft the shared schema rejects', async () => {
      const { edit, save } = opened();
      edit.change(25);
      expect(edit.validationError()).toBeDefined();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
      await edit.flush();
      edit.close();
      await edit.settled();
      expect(save).not.toHaveBeenCalled();
      expect(edit.open()).toBe(true);
    });

    it('saves a change made during a save after that save finishes', async () => {
      const gate = Promise.withResolvers<undefined>();
      const { source, edit, save } = opened();
      save.mockImplementationOnce(async (value): Promise<void> => {
        await gate.promise;
        source.set(value);
      });
      edit.change(4);
      const first = edit.flush();
      edit.change(5);
      await edit.flush();
      gate.resolve(undefined);
      await first;
      expect(save.mock.calls).toStrictEqual([[4], [5]]);
      expect(source()).toBe(5);
    });
  });

  describe('closing', () => {
    it('blur saves the pending change at once and shows the read view', async () => {
      const { edit, save } = opened();
      edit.change(4);
      edit.close();
      await edit.settled();
      expect(save).toHaveBeenCalledExactlyOnceWith(4);
      expect(edit.open()).toBe(false);
      expect(edit.display()).toBe('4');
    });

    it('closes by itself once the revert window passes untouched', async () => {
      const { edit } = opened();
      edit.change(4);
      await edit.flush();
      expect(edit.open()).toBe(true);
      await vi.advanceTimersByTimeAsync(REVERT_WINDOW_MS);
      expect(edit.open()).toBe(false);
      expect(edit.canRevert()).toBe(false);
      expect(edit.status()).toBe(InlineEditStatus.Idle);
    });

    it('escape drops an unsaved change and closes', async () => {
      const { edit, save } = opened();
      edit.change(9);
      edit.cancel();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
      expect(save).not.toHaveBeenCalled();
      expect(edit.draft()).toBe(3);
      expect(edit.open()).toBe(false);
    });
  });

  describe('revert', () => {
    it('restores the value from before the edit session, for a limited time', async () => {
      const { source, edit, save } = opened();
      edit.change(4);
      await edit.flush();
      edit.change(5);
      edit.close();
      await edit.settled();
      expect(edit.canRevert()).toBe(true);
      await edit.revert();
      expect(save).toHaveBeenLastCalledWith(3);
      expect(source()).toBe(3);
      expect(edit.canRevert()).toBe(false);
    });

    it('is no longer offered after the window', async () => {
      const { edit } = opened();
      edit.change(4);
      await edit.flush();
      await vi.advanceTimersByTimeAsync(REVERT_WINDOW_MS);
      expect(edit.canRevert()).toBe(false);
    });
  });

  describe('failures', () => {
    it('reports conflicts separately from failures and drops the losing change', async () => {
      const { edit } = opened(() => new ConflictError('stale'));
      edit.change(4);
      await edit.flush();
      expect(edit.status()).toBe(InlineEditStatus.Conflict);
      expect(edit.error()).toBeDefined();
      expect(edit.draft()).toBe(3);
      expect(edit.canRevert()).toBe(false);
    });

    it('keeps a failed change so it can be retried', async () => {
      const { edit } = opened(() => new Error('offline'));
      edit.change(4);
      await edit.flush();
      expect(edit.status()).toBe(InlineEditStatus.Error);
      expect(edit.draft()).toBe(4);
      expect(edit.dirty()).toBe(true);
    });
  });

  describe('drafts', () => {
    it('a new server value replaces a clean draft', () => {
      const { source, edit } = setup();
      source.set(3);
      source.set(5);
      expect(edit.draft()).toBe(5);
    });

    it('a new server value does not clobber unsaved typing', () => {
      const { source, edit } = opened();
      edit.change(9);
      source.set(5);
      expect(edit.draft()).toBe(9);
    });
  });
});
