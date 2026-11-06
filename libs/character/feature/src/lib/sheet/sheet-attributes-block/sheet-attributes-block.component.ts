import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { AsyncData, AsyncPending, AsyncRegion, Surface } from '@pioneer/frontier';
import { Attribute } from '@pioneer/rules/sdk';
import { AttributeRolls } from '@pioneer/rules/ui';
import type { AttributeRoll } from '@pioneer/rules/ui';

import { SheetRolls } from '../sheet-rolls';
import { SheetState } from '../sheet-state';

/** The physical attributes, then the mental ones: a card each, three rows apiece. */
const GROUPS: readonly (readonly Attribute[])[] = [
  [Attribute.Strength, Attribute.Dexterity, Attribute.Constitution],
  [Attribute.Intelligence, Attribute.Wisdom, Attribute.Charisma],
];

/** The six attributes as two cards in the sheet's header row, three rows each; every modifier rolls a flat check. */
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
  protected readonly groups = GROUPS;
  readonly #rolls = inject(SheetRolls);
  readonly #i18n = inject(TranslocoService);

  protected roll({ name, modifier }: AttributeRoll): void {
    this.#rolls.rollFlat(this.#i18n.translate(name), modifier);
  }
}
