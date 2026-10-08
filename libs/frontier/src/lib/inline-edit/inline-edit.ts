import { computed, linkedSignal, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { issueMessage, message, Milliseconds } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import { Debouncer } from '@tanstack/angular-pacer';
import type { z } from 'zod';

export const InlineEditStatus = {
  /** No server value yet: render a skeleton. */
  Loading: 'loading',
  /** Read view. */
  Idle: 'idle',
  /** Control open, nothing in flight. */
  Editing: 'editing',
  /** A save is in flight (TanStack's `pending`). */
  Pending: 'pending',
  /** After a successful save; the revert window is open (see `canRevert`). */
  Success: 'success',
  Error: 'error',
  /** The server rejected the save because the record changed elsewhere. */
  Conflict: 'conflict',
} as const;
export type InlineEditStatus = ValueOf<typeof InlineEditStatus>;

/** Fallback messages; their `en` text is in frontier's `i18n/en.json`. */
const InlineEditMessage = {
  Conflict: 'frontier.inlineEdit.conflict',
  SaveFailed: 'frontier.inlineEdit.saveFailed',
} as const;

/** Quiet time after the last change before it saves. */
export const SAVE_DEBOUNCE: Milliseconds = Milliseconds.parse(600);
/** How long Revert is offered after a save; the field then closes if untouched. */
export const REVERT_WINDOW: Milliseconds = Milliseconds.parse(5000);
/** How long the tick shows after a revert, which itself can't be reverted. */
const REVERTED_FLASH: Milliseconds = Milliseconds.parse(1500);

/** Server-side phase; the open/closed view is tracked separately. */
const Phase = {
  Idle: 'idle',
  Pending: 'pending',
  Success: 'success',
  Error: 'error',
  Conflict: 'conflict',
} as const;
type Phase = ValueOf<typeof Phase>;

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
  /** What to show when a save fails; defaults to a generic conflict or save-failed message. */
  readonly describeError?: (error: unknown) => MessageDescriptor;
}

/**
 * State machine for one inline-editable field. Each field on a page owns one,
 * so loading, saving and errors are per field, not per form. There are no
 * save or cancel buttons: changes save themselves.
 *
 * tap → open → change … (600ms quiet) → saving → saved (+ Revert for 5s)
 *  ↑                                                  ↓ blur, or 5s untouched
 *  └──────────────────────────── read view ←──────────┘
 *
 * Enter or blur saves a pending change at once; Escape drops an unsaved
 * change and closes. Revert puts back the value from before the edit
 * session and saves that. One save is in flight at a time; changes made
 * meanwhile save after it.
 */
export class InlineEdit<TValue> {
  /** The value being edited. Follows the server value unless it holds unsaved changes. */
  public readonly draft;
  public readonly status: Signal<InlineEditStatus>;
  /** Whether the control is shown instead of the read view. */
  public readonly open: Signal<boolean>;
  public readonly canRevert: Signal<boolean>;
  /** Why the last save failed, to format in the viewer's locale. */
  public readonly error: Signal<MessageDescriptor | undefined>;
  /** Why the draft is invalid, to format in the viewer's locale. */
  public readonly validationError: Signal<MessageDescriptor | undefined>;
  public readonly display: Signal<string>;
  public readonly busy: Signal<boolean>;
  public readonly dirty: Signal<boolean>;

  readonly #options: InlineEditOptions<TValue>;
  readonly #open = signal(false);
  readonly #phase = signal<Phase>(Phase.Idle);
  readonly #error = signal<MessageDescriptor | undefined>(undefined);
  readonly #canRevert = signal(false);
  /** Value before this edit session; what Revert restores. */
  #original: TValue | undefined;
  #queued = false;
  /** Latest background flush; held so it isn't a floating promise. Never rejects. */
  #flushing: Promise<void> = Promise.resolve();
  /** Saves once typing goes quiet (TanStack Pacer). */
  readonly #debouncer = new Debouncer(
    () => {
      this.flushSoon();
    },
    { wait: SAVE_DEBOUNCE },
  );
  #revertTimer: number | undefined;

  public constructor(options: InlineEditOptions<TValue>) {
    this.#options = options;
    const { source, schema, empty, format = String } = options;
    this.draft = linkedSignal<TValue | undefined, TValue>({
      source,
      // Adopt a new server value only if the draft had no unsaved changes.
      computation: (value, previous) =>
        previous === undefined || Object.is(previous.value, previous.source ?? empty)
          ? (value ?? empty)
          : previous.value,
    });
    this.dirty = computed(() => !Object.is(this.draft(), source() ?? empty));
    this.open = this.#open.asReadonly();
    this.canRevert = this.#canRevert.asReadonly();
    this.error = this.#error.asReadonly();
    this.status = computed(() => {
      if (source() === undefined) {
        return InlineEditStatus.Loading;
      }
      const phase = this.#phase();
      if (phase !== Phase.Idle) {
        return phase;
      }
      return this.#open() ? InlineEditStatus.Editing : InlineEditStatus.Idle;
    });
    this.validationError = computed(() => {
      const result = schema.safeParse(this.draft());
      const [issue] = result.success ? [] : result.error.issues;
      return issue === undefined ? undefined : issueMessage(issue);
    });
    this.display = computed(() => (source() === undefined ? '' : format(this.draft())));
    this.busy = computed(() => this.#phase() === Phase.Pending);
  }

  /** Open the control. Keeps the original value if reopened inside the revert window. */
  public edit(): void {
    if (this.status() === InlineEditStatus.Loading || this.#open()) {
      return;
    }
    if (!this.#canRevert()) {
      this.#original = this.#options.source();
    }
    this.#open.set(true);
  }

  /** A new value from the control: validate now, save once input goes quiet. */
  public change(value: TValue): void {
    this.draft.set(value);
    this.#debouncer.cancel();
    if (this.validationError() === undefined) {
      this.#debouncer.maybeExecute();
    }
  }

  /** Save a pending change now (Enter, a select pick, blur). */
  public async flush(): Promise<void> {
    this.#debouncer.cancel();
    if (this.dirty() && this.validationError() === undefined) {
      await this.#save(this.draft(), true);
    }
  }

  /** `flush` for event handlers and timers. Saves never reject: failures land in `status`/`error`. */
  public flushSoon(): void {
    this.#flushing = this.flush();
  }

  /** Resolves once the latest background save (debounce, blur) has finished. */
  public async settled(): Promise<void> {
    await this.#flushing;
  }

  /** Focus left the field: save what is pending and show the read view. Invalid drafts stay open. */
  public close(): void {
    if (this.validationError() !== undefined) {
      return;
    }
    this.#open.set(false);
    this.flushSoon();
  }

  /** Escape: drop the unsaved change and close. Saved changes stay; use Revert for those. */
  public cancel(): void {
    this.#debouncer.cancel();
    this.draft.set(this.#options.source() ?? this.#options.empty);
    this.#error.set(undefined);
    if (this.#phase() === Phase.Error || this.#phase() === Phase.Conflict) {
      this.#phase.set(Phase.Idle);
    }
    this.#open.set(false);
  }

  /** Put back the value from before this edit session. */
  public async revert(): Promise<void> {
    const original = this.#original;
    if (!this.#canRevert() || original === undefined) {
      return;
    }
    this.#debouncer.cancel();
    clearTimeout(this.#revertTimer);
    this.#canRevert.set(false);
    this.#open.set(false);
    this.draft.set(original);
    await this.#save(original, false);
  }

  /** One save at a time; a change made meanwhile saves once this one lands. */
  async #save(value: TValue, revertible: boolean): Promise<void> {
    if (this.busy()) {
      this.#queued = true;
      return;
    }
    const ok = await this.#attempt(value, revertible);
    const queued = this.#queued;
    this.#queued = false;
    if (ok && queued) {
      await this.flush();
    }
  }

  async #attempt(value: TValue, revertible: boolean): Promise<boolean> {
    clearTimeout(this.#revertTimer);
    this.#error.set(undefined);
    this.#phase.set(Phase.Pending);
    try {
      await this.#options.save(value);
    } catch (error: unknown) {
      this.#fail(error);
      return false;
    }
    this.#saved(revertible);
    return true;
  }

  #saved(revertible: boolean): void {
    this.#phase.set(Phase.Success);
    this.#canRevert.set(revertible);
    this.#revertTimer = setTimeout(
      () => {
        this.#canRevert.set(false);
        if (this.#phase() === Phase.Success) {
          this.#phase.set(Phase.Idle);
        }
        if (!this.dirty() && !this.busy()) {
          this.#open.set(false);
        }
      },
      revertible ? REVERT_WINDOW : REVERTED_FLASH,
    );
  }

  #fail(error: unknown): void {
    const conflict = this.#options.isConflict?.(error) ?? false;
    this.#error.set(
      this.#options.describeError?.(error) ??
        message(conflict ? InlineEditMessage.Conflict : InlineEditMessage.SaveFailed),
    );
    this.#phase.set(conflict ? Phase.Conflict : Phase.Error);
    if (conflict) {
      // Drop the losing change so the draft adopts the server's version when it reloads.
      this.draft.set(this.#options.source() ?? this.#options.empty);
      this.#canRevert.set(false);
    }
  }
}
