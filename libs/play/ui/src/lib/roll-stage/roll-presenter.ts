import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { Milliseconds } from '@pioneer/shared/kernel';

import { DICE_ROLLER_FACTORY } from './dice-roller';
import type { DiceRoller } from './dice-roller';
import type { RollPresentation } from './roll-presentation';

/** How long the dice stay on screen after they settle, so the player can read them. */
export const DICE_LINGER: Milliseconds = Milliseconds.parse(1500);
/** How long the result toast stays once it shows; a newer roll replaces it sooner. */
export const TOAST_DURATION: Milliseconds = Milliseconds.parse(5000);

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Shows a roll: the dice tumble across the screen (the overlay), then the result appears in the toast (ADR-0074).
 * The page that rolls hands over what the engine rolled; the dice land on those faces and can change nothing.
 * `prefers-reduced-motion`, a roll with no dice and a dice library that fails to load all skip the animation and show
 * the toast at once. `RollStage` renders what this holds.
 */
@Injectable({ providedIn: 'root' })
export class RollPresenter {
  readonly #factory = inject(DICE_ROLLER_FACTORY);
  readonly #document = inject(DOCUMENT);
  readonly #throwing = signal<RollPresentation | undefined>(undefined);
  readonly #shown = signal<RollPresentation | undefined>(undefined);
  #run = 0;
  #roller: DiceRoller | undefined;

  /** The roll whose dice are on screen; the overlay shows while it is set. */
  public readonly throwing: Signal<RollPresentation | undefined> = this.#throwing.asReadonly();
  /** The roll the toast names; unset when the toast is closed. */
  public readonly toast: Signal<RollPresentation | undefined> = this.#shown.asReadonly();

  /** Starts showing `roll`, replacing whatever was showing. */
  public present(roll: RollPresentation): void {
    this.#reset();
    const noMotion = this.#document.defaultView?.matchMedia(REDUCED_MOTION).matches === true;
    if (noMotion || roll.groups.length === 0) {
      this.#show(roll);
      return;
    }
    this.#throwing.set(roll);
  }

  /** Throws `roll`'s dice across `surface`, then shows the toast. The overlay calls this once it is on screen. */
  public async play(surface: HTMLElement, roll: RollPresentation): Promise<void> {
    const run = this.#run;
    const roller = await this.#start(surface);
    if (run !== this.#run) {
      roller?.dispose();
      return;
    }
    this.#roller = roller;
    await roller?.roll(roll.groups).catch(() => undefined);
    if (run !== this.#run) {
      return;
    }
    this.#show(roll);
    setTimeout(() => {
      if (run === this.#run) {
        this.#endThrow();
      }
    }, DICE_LINGER);
  }

  /** The roller on `surface`; unset when the dice library cannot load, which leaves only the toast. */
  async #start(surface: HTMLElement): Promise<DiceRoller | undefined> {
    return this.#factory(surface).catch(() => undefined);
  }

  #show(roll: RollPresentation): void {
    this.#shown.set(roll);
    setTimeout(() => {
      if (this.#shown() === roll) {
        this.#shown.set(undefined);
      }
    }, TOAST_DURATION);
  }

  #endThrow(): void {
    this.#roller?.dispose();
    this.#roller = undefined;
    this.#throwing.set(undefined);
  }

  #reset(): void {
    this.#run += 1;
    this.#endThrow();
    this.#shown.set(undefined);
  }
}
