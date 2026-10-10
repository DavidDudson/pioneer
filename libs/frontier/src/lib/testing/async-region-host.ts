import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';

import { AsyncData } from '../async/async-region/async-data.directive';
import { AsyncError } from '../async/async-region/async-error.directive';
import { AsyncPending } from '../async/async-region/async-pending.directive';
import type { AsyncQuery } from '../async/async-region/async-query';
import { AsyncRegion } from '../async/async-region/async-region.component';
import { Skeleton } from '../feedback/skeleton/skeleton.component';
import { Text } from '../text/text/text.component';

/** A stand-in for an `injectQuery(...)` result that a spec moves between states. */
export class FakeQuery<TData> implements AsyncQuery<TData> {
  public readonly data = signal<TData | undefined>(undefined);
  public readonly error = signal<unknown>(undefined);
  readonly #pending: WritableSignal<boolean> = signal(true);

  public isPending(): boolean {
    return this.#pending();
  }

  public isError(): boolean {
    return this.error() !== undefined;
  }

  public succeed(data: TData): void {
    this.error.set(undefined);
    this.data.set(data);
    this.#pending.set(false);
  }

  public fail(error: unknown): void {
    this.error.set(error);
    this.#pending.set(false);
  }
}

/**
 * An `fr-async-region` with a skeleton pending slot and a data slot that lists the query's strings, the way a
 * feature fills it, plus an error slot when `customError` is set.
 */
@Component({
  selector: 'fr-async-region-host',
  imports: [AsyncData, AsyncError, AsyncPending, AsyncRegion, Skeleton, Text],
  templateUrl: './async-region-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsyncRegionHost {
  public readonly query = input.required<AsyncQuery<readonly string[]>>();
  public readonly errorMessage = input<string | undefined>(undefined);
  public readonly customError = input(false);

  protected describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
