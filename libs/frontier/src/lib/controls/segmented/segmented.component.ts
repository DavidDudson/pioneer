import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { cva } from 'class-variance-authority';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import { Control } from '../control';
import type { SelectOption } from '../select/select.component';

const trackVariants = cva('grid grid-flow-col auto-cols-fr gap-3xs border border-line-default bg-surface-base p-3xs', {
  variants: { invalid: { true: 'border-danger-line', false: '' } },
});

/**
 * Single-select, preferred for two or three options: every option visible as one equal-width button in a
 * track, the chosen one filled with the accent. A pick sets `value` and fires `committed`; pressing
 * the chosen option again does nothing. In a form use `fr-segmented-field`. Past three options
 * the row gets cramped on a phone; prefer `fr-select` there.
 *
 * ```html
 * <fr-segmented [options]="units" [(value)]="unit" ariaLabel="Distance unit" />
 * ```
 */
@Component({
  selector: 'fr-segmented',
  imports: [Button],
  templateUrl: './segmented.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Segmented<TValue extends string> extends Control {
  public readonly value = model<TValue | undefined>(undefined);
  public readonly options = input.required<readonly SelectOption<TValue>[]>();

  protected readonly variant = ButtonVariant.Segment;
  protected readonly trackClasses = computed(() => trackVariants({ invalid: this.ariaInvalid() }));

  protected choose(value: TValue): void {
    if (value === this.value()) {
      return;
    }
    this.value.set(value);
    this.committed.emit();
  }
}
