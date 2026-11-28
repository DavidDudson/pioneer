import { Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';

/** Holds the sheet's section registries back until the engine's has settled, so the header does not wait on them. */
@Injectable()
export class SheetContentGate {
  readonly #released = signal(false);

  /** Whether the engine's registry has settled, so the sections may load. */
  public readonly released: Signal<boolean> = this.#released.asReadonly();

  /** Lets the sections load. Stays released: a later reload of the engine's registry holds nothing back. */
  public release(): void {
    this.#released.set(true);
  }
}
