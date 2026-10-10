import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';

import type { AsyncQuery } from '../async/async-region/async-query';

/** A stand-in for an `injectQuery(...)` result that a spec moves between states. Starts pending. */
export class FakeQuery<TData> implements AsyncQuery<TData> {
  public readonly data = signal<TData | undefined>(undefined);
  public readonly error = signal<unknown>(undefined);
  readonly #pending: WritableSignal<boolean> = signal(true);
  readonly #nextPageFailed: WritableSignal<boolean> = signal(false);

  public isPending(): boolean {
    return this.#pending();
  }

  public isError(): boolean {
    return this.error() !== undefined;
  }

  public isFetchNextPageError(): boolean {
    return this.#nextPageFailed();
  }

  public succeed(data: TData): void {
    this.error.set(undefined);
    this.#nextPageFailed.set(false);
    this.data.set(data);
    this.#pending.set(false);
  }

  public fail(error: unknown): void {
    this.error.set(error);
    this.#pending.set(false);
  }

  /** An infinite query's next page fails: the query errors but keeps its data. */
  public failNextPage(error: unknown): void {
    this.fail(error);
    this.#nextPageFailed.set(true);
  }
}
