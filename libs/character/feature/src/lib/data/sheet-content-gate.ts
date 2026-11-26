import { Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';

/**
 * Whether the sheet's sections may load their content. The sheet's header waits on the registry the engine reads, and
 * the sections below it each ask for kinds of their own. Fetched together they share the browser's connections and
 * the store's reads, so the header waits on content only a section needs; the gate holds the sections back until the
 * engine's registry has settled.
 */
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
