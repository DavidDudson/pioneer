import { ChangeDetectionStrategy, Component, computed, contentChildren, inject, model, output } from '@angular/core';
import type { Signal } from '@angular/core';

import { Step } from './step.component';
import { STEPPER } from './stepper-context';
import type { StepperContext } from './stepper-context';

/**
 * A guided sequence with progressive disclosure: only the current `fr-step` shows its controls, steps before it
 * collapse to a summary of the choice with an Edit control, and steps after it are not rendered. A step's Next
 * enables once the step is `valid`. Going back to an earlier step closes the later ones again, so they are walked
 * (and validated) once more; clearing answers the edit made stale is the owner's, since only it knows them.
 * `[(current)]` follows the user, so an owner can keep the step in the URL. The last step's Next reads "Finish" and
 * emits `finished`.
 *
 * ```html
 * <fr-stepper [(current)]="step" (finished)="create()">
 *   <fr-step [label]="'create.identity' | transloco" [summary]="name()" [valid]="name() !== ''">
 *     <ng-template frStepBody><pio-identity-fields /></ng-template>
 *   </fr-step>
 * </fr-stepper>
 * ```
 */
@Component({
  selector: 'fr-stepper',
  templateUrl: './stepper.component.html',
  providers: [{ provide: STEPPER, useFactory: (): StepperContext => inject(Stepper) }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', role: 'list' },
})
export class Stepper implements StepperContext {
  /** The index of the step shown in full. */
  public readonly current = model(0);
  /** The last step was completed. */
  public readonly finished = output();

  private readonly steps = contentChildren(Step);
  public readonly count: Signal<number> = computed(() => this.steps().length);

  public position(step: object): number {
    const steps: readonly object[] = this.steps();
    return steps.indexOf(step);
  }

  public goTo(index: number): void {
    const last = Math.max(this.count() - 1, 0);
    const clamped = Math.max(index, 0);
    this.current.set(Math.min(clamped, last));
  }

  public finish(): void {
    this.finished.emit();
  }
}
