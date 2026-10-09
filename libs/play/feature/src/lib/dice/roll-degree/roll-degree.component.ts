import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { DegreeView } from '../roll-view';

/** A roll's degree of success, then each step that led to it (comparison, natural die, adjustments) and why. */
@Component({
  selector: 'pio-roll-degree',
  imports: [Stack, Text, TranslocoPipe],
  templateUrl: './roll-degree.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollDegree {
  readonly #format = inject(LocaleFormat);
  public readonly degree = input.required<DegreeView>();

  /** Step reasons carry raw totals and DCs; format them in the viewer's locale like the rest of the card. */
  protected readonly display = computed((): DegreeView => {
    const degree = this.degree();
    return {
      degreeKey: degree.degreeKey,
      steps: degree.steps.map((step) => ({ degreeKey: step.degreeKey, reason: this.#localised(step.reason) })),
    };
  });

  #localised(descriptor: MessageDescriptor): MessageDescriptor {
    if (descriptor.params === undefined) {
      return descriptor;
    }
    const params = Object.fromEntries(
      Object.entries(descriptor.params).map(([name, value]) => [
        name,
        typeof value === 'number' ? this.#format.number(value) : value,
      ]),
    );
    return message(descriptor.key, params);
  }
}
