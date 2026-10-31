import { NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { cva } from 'class-variance-authority';

import { uniqueId } from '../../ids';
import { Heading } from '../../text/heading/heading.component';
import { Text } from '../../text/text/text.component';
import { Button, ButtonVariant } from '../button/button.component';
import { StepBody } from './step-body.directive';
import { STEPPER } from './stepper-context';

const regionClasses = cva('flex flex-col gap-sm py-sm')();
const actionClasses = cva('flex gap-sm')();
const summaryClasses = cva('flex items-center justify-between gap-sm')();

/** Where a step is relative to the one being worked on. */
const StepState = { Done: 'done', Current: 'current', Upcoming: 'upcoming' } as const;

/**
 * One step of an `fr-stepper`. The current step shows its `frStepBody` controls with Back and Next; an earlier step
 * shows its `summary` and an Edit button; a later step shows nothing. Moving to a step moves focus to its heading.
 */
@Component({
  selector: 'fr-step',
  imports: [Button, Heading, NgTemplateOutlet, Text, TranslocoPipe],
  templateUrl: './step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', role: 'listitem', '[attr.aria-current]': 'state() === "current" ? "step" : null' },
})
export class Step {
  /** The step's name, already translated. */
  public readonly label = input.required<string>();
  /** What was chosen, already translated, shown once the user has moved past the step. */
  public readonly summary = input<string | undefined>(undefined);
  /** Whether the step's answers allow moving on. */
  public readonly valid = input(true, { transform: booleanAttribute });

  protected readonly body = contentChild(StepBody);
  protected readonly regionClasses = regionClasses;
  protected readonly actionClasses = actionClasses;
  protected readonly summaryClasses = summaryClasses;
  protected readonly headingId = uniqueId('fr-step');
  protected readonly secondary = ButtonVariant.Secondary;
  protected readonly primary = ButtonVariant.Primary;

  readonly #stepper = inject(STEPPER);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly index = computed(() => this.#stepper.position(this));
  protected readonly isFirst = computed(() => this.index() === 0);
  protected readonly isLast = computed(() => this.index() === this.#stepper.count() - 1);
  protected readonly state = computed(() => {
    const index = this.index();
    const current = this.#stepper.current();
    if (index < 0 || index > current) {
      return StepState.Upcoming;
    }
    return index === current ? StepState.Current : StepState.Done;
  });

  public constructor() {
    let shown = false;
    afterRenderEffect(() => {
      const isCurrent = this.state() === StepState.Current;
      // The first render is not a move; only a step the user arrives at takes focus.
      if (isCurrent && shown) {
        this.#host.nativeElement.querySelector<HTMLElement>(`#${this.headingId}`)?.focus();
      }
      shown = true;
    });
  }

  protected edit(): void {
    this.#stepper.goTo(this.index());
  }

  protected back(): void {
    this.#stepper.goTo(this.index() - 1);
  }

  protected next(): void {
    if (this.isLast()) {
      this.#stepper.finish();
    } else {
      this.#stepper.goTo(this.index() + 1);
    }
  }
}
