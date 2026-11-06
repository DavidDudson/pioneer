import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { AsyncData, AsyncPending, AsyncRegion, Surface } from '@pioneer/frontier';
import { AttributeRolls } from '@pioneer/rules/ui';
import type { AttributeRoll } from '@pioneer/rules/ui';

import { SheetRolls } from '../sheet-rolls';
import { SheetState } from '../sheet-state';

/** The six attributes as rows in a card in the sheet's header row; each modifier rolls a flat check. */
@Component({
  selector: 'pio-sheet-attributes-block',
  imports: [AsyncData, AsyncPending, AsyncRegion, AttributeRolls, Surface],
  templateUrl: './sheet-attributes-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetAttributesBlock {
  protected readonly sheet = inject(SheetState);
  protected readonly picks = this.sheet.picks;
  readonly #rolls = inject(SheetRolls);
  readonly #i18n = inject(TranslocoService);

  protected roll({ name, modifier }: AttributeRoll): void {
    this.#rolls.rollFlat(this.#i18n.translate(name), modifier);
  }
}
