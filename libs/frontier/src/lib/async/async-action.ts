import { computed, DestroyRef, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { ValueOf } from '@pioneer/shared/kernel';
import { injectMutation } from '@tanstack/angular-query-experimental';
import type { MutationStatus } from '@tanstack/angular-query-experimental';

/** TanStack Query's mutation status, shared by every async frontier component. */
export const AsyncStatus = {
  /** Not started, or back to rest after a success. */
  Idle: 'idle',
  /** In flight: show a spinner in place, block a second press. */
  Pending: 'pending',
  /** Just succeeded: show a tick for `SUCCESS_FLASH_MS`, then return to idle. */
  Success: 'success',
  /** Failed: show the message inline until the next attempt. */
  Error: 'error',
} as const satisfies Record<string, MutationStatus>;
export type AsyncStatus = ValueOf<typeof AsyncStatus>;

/** How long a success tick shows before the action returns to idle. */
export const SUCCESS_FLASH_MS = 2000;

export interface AsyncActionOptions<TData> {
  /** Return false when the run did nothing (e.g. an invalid form): the action goes straight back to idle. */
  readonly accept?: (data: TData) => boolean;
  /** Turns a failure into the inline message. */
  readonly describeError?: (error: unknown) => string;
  readonly onSuccess?: (data: TData) => void;
}

/** The state of one async action, as signals. Mirrors TanStack's mutation result. */
export interface AsyncAction<TVariables> {
  readonly status: Signal<AsyncStatus>;
  readonly isIdle: Signal<boolean>;
  readonly isPending: Signal<boolean>;
  readonly isSuccess: Signal<boolean>;
  readonly isError: Signal<boolean>;
  readonly errorMessage: Signal<string | undefined>;
  /** Start the action. Ignored while one is in flight; failures land in `status`, never reject. */
  readonly run: (variables: TVariables) => void;
  readonly reset: () => void;
}

/** The success-flash timer, tied to its owner's lifetime. */
interface Flash {
  readonly start: (done: () => void) => void;
  readonly stop: () => void;
  /** The owner is gone (e.g. its action navigated away before resolving): nobody is listening. */
  readonly destroyed: () => boolean;
}

function injectFlash(): Flash {
  let timer: ReturnType<typeof setTimeout> | undefined = undefined;
  let destroyed = false;
  inject(DestroyRef).onDestroy(() => {
    destroyed = true;
    clearTimeout(timer);
  });
  return {
    start: (done) => {
      timer = setTimeout(done, SUCCESS_FLASH_MS);
    },
    stop: () => {
      clearTimeout(timer);
    },
    destroyed: () => destroyed,
  };
}

/**
 * A TanStack mutation with frontier's feedback timing: pending while in
 * flight, success for `SUCCESS_FLASH_MS`, then idle again; errors stay until
 * the next run. Call in an injection context. Needs `provideTanStackQuery`.
 *
 * ```ts
 * readonly delete = injectAsyncAction(() => async () => this.store.delete(this.id()));
 * ```
 */
export function injectAsyncAction<TData, TVariables = void>(
  action: () => (variables: TVariables) => Promise<TData>,
  options: AsyncActionOptions<TData> = {},
): AsyncAction<TVariables> {
  const i18n = inject(TranslocoService);
  const {
    accept = (): boolean => true,
    describeError = (): string => i18n.translate('frontier.async.actionFailed'),
    onSuccess,
  } = options;
  const flash = injectFlash();
  const mutation = injectMutation(() => ({
    mutationFn: async (variables: TVariables): Promise<TData> => action()(variables),
    onMutate: flash.stop,
    onSuccess: (data: TData): void => {
      if (flash.destroyed()) {
        return;
      }
      if (!accept(data)) {
        mutation.reset();
        return;
      }
      onSuccess?.(data);
      flash.start(() => {
        mutation.reset();
      });
    },
  }));

  const status = computed<AsyncStatus>(() => mutation.status());
  return {
    status,
    isIdle: computed(() => status() === AsyncStatus.Idle),
    isPending: computed(() => status() === AsyncStatus.Pending),
    isSuccess: computed(() => status() === AsyncStatus.Success),
    isError: computed(() => status() === AsyncStatus.Error),
    errorMessage: computed(() => (status() === AsyncStatus.Error ? describeError(mutation.error()) : undefined)),
    run: (variables) => {
      if (status() !== AsyncStatus.Pending) {
        mutation.mutate(variables);
      }
    },
    reset: () => {
      flash.stop();
      mutation.reset();
    },
  };
}
