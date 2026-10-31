import { InjectionToken } from '@angular/core';
import type { Signal } from '@angular/core';

/** What a step needs from its stepper, so `fr-step` need not import `fr-stepper`. */
export interface StepperContext {
  /** The index of the step shown in full. */
  readonly current: Signal<number>;
  /** How many steps there are. */
  readonly count: Signal<number>;
  /** The index of `step`, or -1 before it is registered. */
  readonly position: (step: object) => number;
  /** Shows the step at `index` in full. Later steps close until the user reaches them again. */
  readonly goTo: (index: number) => void;
  /** The last step was completed. */
  readonly finish: () => void;
}

export const STEPPER = new InjectionToken<StepperContext>('STEPPER');
