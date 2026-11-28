import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { AsyncStatus } from '../../async/async-action';
import { INPUT_GROUP } from './input-group';

const groupVariants = cva(
  'status-border flex w-full items-stretch border bg-surface-base focus-within:focus-ring forced-colors:border-system-canvas-text',
  {
    variants: {
      invalid: { true: 'border-danger-line', false: 'border-line-default' },
      disabled: { true: 'opacity-disabled', false: '' },
    },
    defaultVariants: { invalid: false, disabled: false },
  },
);

/**
 * One box around an `fr-input` and any number of `fr-input-addon`s, before or after it, in the order written. The
 * group draws the border, the focus ring and the `status` of a load or save; the input and addons are flat inside.
 * There is no slot count: add as many addons at either end as the control needs.
 */
@Component({
  selector: 'fr-input-group',
  templateUrl: './input-group.component.html',
  providers: [{ provide: INPUT_GROUP, useValue: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()', '[attr.data-status]': 'dataStatus()' },
})
export class InputGroup {
  public readonly invalid = input(false, { transform: booleanAttribute });
  public readonly disabled = input(false, { transform: booleanAttribute });
  /** The state of the load or save behind the value, shown on the group's border. */
  public readonly status = input<AsyncStatus>(AsyncStatus.Idle);

  protected readonly classes = computed(() => groupVariants({ invalid: this.invalid(), disabled: this.disabled() }));
  protected readonly dataStatus = computed(() => (this.status() === AsyncStatus.Idle ? undefined : this.status()));
}
