import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { injectTranslate } from '@pioneer/frontier';
import { Rarity } from '@pioneer/rules/sdk';

import { FEAT_RARITY_MESSAGES } from '../../feat-picker/feat-picker-messages';
import { ChipList, RARITY_TONES } from '../../picker-cells/chip-list/chip-list.component';
import type { Chip } from '../../picker-cells/chip-list/chip-list.component';
import type { FeatFacts } from '../feat-facts';

/**
 * A feat's traits, a rarity above common first and toned by it.
 *
 * ```html
 * <pio-feat-traits-cell [entity]="feat" />
 * ```
 */
@Component({
  selector: 'pio-feat-traits-cell',
  imports: [ChipList],
  templateUrl: './feat-traits-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatTraitsCell {
  public readonly entity = input.required<FeatFacts>();

  readonly #i18n = inject(TranslocoService);
  /** Changes when the language changes or the messages load, so the rarity is read again. */
  readonly #messages = injectTranslate();

  protected readonly chips = computed((): ReadonlyArray<Chip> => {
    this.#messages();
    const { rarity, traits } = this.entity();

    if (rarity === Rarity.Common) {
      return traits;
    }

    return [{ label: this.#i18n.translate(FEAT_RARITY_MESSAGES[rarity]), tone: RARITY_TONES[rarity] }, ...traits];
  });
}
