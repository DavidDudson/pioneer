import { booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { AsyncStatus } from '../../async/async-action';
import { Input } from '../input/input.component';
import { INPUT_GROUP } from './input-group';

const groupVariants = cva(
  'status-border flex w-full items-stretch border bg-surface-base has-focus-visible:focus-ring forced-colors:border-system-canvas-text',
  {
    variants: {
      invalid: { true: 'border-danger-line', false: 'border-line-default' },
      disabled: { true: 'cursor-not-allowed', false: '' },
    },
    defaultVariants: { invalid: false, disabled: false },
  },
);

/**
 * One box around an `fr-input` and its `fr-input-addon`s, in the order written. It draws the border, focus ring and
 * `status`, so it carries `invalid` and `disabled` for the input inside; a press on it that misses a button focuses the input.
 */
@Component({
  selector: 'fr-input-group',
  templateUrl: './input-group.component.html',
  providers: [{ provide: INPUT_GROUP, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', '[attr.data-status]': 'dataStatus()', '(mousedown)': 'focusInput($event)' },
})
export class InputGroup {
  public readonly invalid = input(false, { transform: booleanAttribute });
  public readonly disabled = input(false, { transform: booleanAttribute });
  /** The state of the load or save behind the value, shown on the group's border. */
  public readonly status = input<AsyncStatus>(AsyncStatus.Idle);

  protected readonly classes = computed(() => groupVariants({ invalid: this.invalid(), disabled: this.disabled() }));
  protected readonly dataStatus = computed(() => (this.status() === AsyncStatus.Idle ? undefined : this.status()));

  protected readonly control = contentChild(Input);

  /** A press on the box that misses a button (a decorative addon, the padding) focuses the input, as the old overlaid icon did. */
  protected focusInput(event: MouseEvent): void {
    const pressedControl = event.target instanceof Element && event.target.closest('button, input') !== null;

    if (pressedControl) {
      return;
    }

    event.preventDefault();
    this.control()?.focus();
  }
}
