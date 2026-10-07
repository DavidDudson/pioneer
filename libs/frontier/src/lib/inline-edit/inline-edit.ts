import { computed, linkedSignal, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import type { z } from 'zod';

export const InlineEditStatus = {
  /** No server value yet: render a skeleton. */
  Loading: 'loading',
  Idle: 'idle',
  Editing: 'editing',
  Saving: 'saving',
  /** Briefly after a successful save, for a confirmation tick. */
  Saved: 'saved',
  Failed: 'failed',
  /** The server rejected the save because the record changed elsewhere. */
  Conflict: 'conflict',
} as const;
export type InlineEditStatus = ValueOf<typeof InlineEditStatus>;

const SAVED_FLASH_MS = 1500;

export interface InlineEditOptions<TValue> {
  /** Latest server value; `undefined` while loading. */
  readonly source: Signal<TValue | undefined>;
  /** Draft value while the source is still loading (never shown; editing is disabled). */
  readonly empty: TValue;
  /** Client-side validation; reuse the shared domain schema so it matches the server. */
  readonly schema: z.ZodType;
  /** Persist one value. Reject to show the error; the source signal refreshes on success. */
  readonly save: (value: TValue) => Promise<void>;
  readonly format?: (value: TValue) => string;
  readonly isConflict?: (error: unknown) => boolean;
  readonly describeError?: (error: unknown) => string;
}

/**
 * State machine for one inline-editable field. Each field on a page owns one,
 * so loading, saving and errors are per field, not per form:
 *
 * loading → idle → editing → saving → saved → idle
 *                     ↑          ↘ failed / conflict
 *                     └── cancel ──┘
 */
export class InlineEdit<TValue> {
  /** The value being edited; resets to the server value whenever it changes. */
  public readonly draft;
  public readonly status: Signal<InlineEditStatus>;
  public readonly error: Signal<string | undefined>;
  public readonly validationError: Signal<string | undefined>;
  public readonly display: Signal<string>;
  public readonly busy: Signal<boolean>;

  readonly #options: InlineEditOptions<TValue>;
  readonly #mode = signal<InlineEditStatus>(InlineEditStatus.Idle);
  readonly #error = signal<string | undefined>(undefined);
  #flashTimer: ReturnType<typeof setTimeout> | undefined;

  public constructor(options: InlineEditOptions<TValue>) {
    this.#options = options;
    const { source, schema, format = String } = options;
    this.draft = linkedSignal<TValue>(() => source() ?? options.empty);
    this.status = computed(() => (source() === undefined ? InlineEditStatus.Loading : this.#mode()));
    this.error = this.#error.asReadonly();
    this.validationError = computed(() => {
      const result = schema.safeParse(this.draft());
      return result.success ? undefined : (result.error.issues[0]?.message ?? 'Invalid value');
    });
    this.display = computed(() => {
      const value = source();
      return value === undefined ? '' : format(value);
    });
    this.busy = computed(() => this.status() === InlineEditStatus.Saving);
  }

  public edit(): void {
    if (this.status() === InlineEditStatus.Loading || this.busy()) {
      return;
    }
    this.draft.set(this.#options.source() ?? this.#options.empty);
    this.#error.set(undefined);
    this.#mode.set(InlineEditStatus.Editing);
  }

  public cancel(): void {
    this.draft.set(this.#options.source() ?? this.#options.empty);
    this.#error.set(undefined);
    this.#mode.set(InlineEditStatus.Idle);
  }

  public async commit(): Promise<void> {
    const draft = this.draft();
    if (this.status() === InlineEditStatus.Loading || this.validationError() !== undefined || this.busy()) {
      return;
    }
    if (Object.is(draft, this.#options.source())) {
      this.#mode.set(InlineEditStatus.Idle);
      return;
    }
    this.#mode.set(InlineEditStatus.Saving);
    try {
      await this.#options.save(draft);
      this.#flash();
    } catch (error: unknown) {
      this.#fail(error);
    }
  }

  #fail(error: unknown): void {
    const conflict = this.#options.isConflict?.(error) ?? false;
    this.#error.set(this.#options.describeError?.(error) ?? (conflict ? 'Changed elsewhere' : 'Could not save'));
    this.#mode.set(conflict ? InlineEditStatus.Conflict : InlineEditStatus.Failed);
  }

  #flash(): void {
    clearTimeout(this.#flashTimer);
    this.#mode.set(InlineEditStatus.Saved);
    this.#flashTimer = setTimeout(() => {
      if (this.#mode() === InlineEditStatus.Saved) {
        this.#mode.set(InlineEditStatus.Idle);
      }
    }, SAVED_FLASH_MS);
  }
}
