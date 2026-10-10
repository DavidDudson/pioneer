import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';

import type { AsyncQuery } from '../async/async-region/async-query';

/** A stand-in for an `injectQuery(...)` result that a spec moves between states. Starts pending. */
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
