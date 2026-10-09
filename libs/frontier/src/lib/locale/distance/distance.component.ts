import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { LocaleFormat } from '../locale-format';

/** A rules distance (always feet) in the viewer's unit and locale: `<fr-distance [feet]="speed" />`. */
@Component({
  selector: 'fr-distance',
  templateUrl: './distance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Distance {
  public readonly feet = input.required<number>();

  readonly #format = inject(LocaleFormat);
  protected readonly text = computed(() => this.#format.distance(this.feet()));
}
