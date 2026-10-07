import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { InlineEdit, InlineEditStatus } from './inline-edit';

class ConflictError extends Error {
  public override readonly name = 'ConflictError';
}

interface Harness {
  readonly source: WritableSignal<number | undefined>;
  readonly edit: InlineEdit<number>;
}

function setup(save: (value: number) => Promise<void>): Harness {
  const source = signal<number | undefined>(undefined);
  const edit = new InlineEdit<number>({
    source,
    empty: 0,
    schema: z.number().int().min(1).max(20),
    save,
    isConflict: (error): boolean => error instanceof ConflictError,
  });
  return { source, edit };
}

async function saved(): Promise<void> {
  // Resolves immediately; stands in for a successful PATCH.
}

function editing(save: (value: number) => Promise<void>, draft: number): InlineEdit<number> {
  const { source, edit } = setup(save);
  source.set(3);
  edit.edit();
  edit.draft.set(draft);
  return edit;
}

describe(InlineEdit, () => {
  describe('loading', () => {
    it('is loading until the source has a value, and cannot be edited', () => {
      const { source, edit } = setup(saved);
      expect(edit.status()).toBe(InlineEditStatus.Loading);
      edit.edit();
      expect(edit.status()).toBe(InlineEditStatus.Loading);
      source.set(3);
      expect(edit.status()).toBe(InlineEditStatus.Idle);
      expect(edit.display()).toBe('3');
    });
  });

  describe('validation', () => {
    it('refuses to commit a draft the shared schema rejects', async () => {
      const save = vi.fn<(value: number) => Promise<void>>(saved);
      const edit = editing(save, 25);
      expect(edit.validationError()).toBeDefined();
      await edit.commit();
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('saving', () => {
    it('goes editing → saving → saved', async () => {
      const gate = Promise.withResolvers<undefined>();
      const edit = editing(async () => {
        await gate.promise;
      }, 4);
      const pending = edit.commit();
      expect(edit.status()).toBe(InlineEditStatus.Saving);
      expect(edit.busy()).toBe(true);
      gate.resolve(undefined);
      await pending;
      expect(edit.status()).toBe(InlineEditStatus.Saved);
    });

    it('reports conflicts separately from failures', async () => {
      const edit = editing(async () => {
        throw new ConflictError('stale');
      }, 4);
      await edit.commit();
      expect(edit.status()).toBe(InlineEditStatus.Conflict);
      expect(edit.error()).toBeDefined();
    });
  });

  describe('drafts', () => {
    it('cancel restores the server value', () => {
      const edit = editing(saved, 9);
      edit.cancel();
      expect(edit.draft()).toBe(3);
      expect(edit.status()).toBe(InlineEditStatus.Idle);
    });

    it('a new server value resets the draft', () => {
      const { source, edit } = setup(saved);
      source.set(3);
      edit.draft.set(9);
      source.set(5);
      expect(edit.draft()).toBe(5);
    });
  });
});
