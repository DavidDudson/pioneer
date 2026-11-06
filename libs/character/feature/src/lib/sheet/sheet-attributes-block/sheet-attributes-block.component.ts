import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncData, AsyncPending, AsyncRegion, Surface } from '@pioneer/frontier';
import { AttributesView } from '@pioneer/rules/ui';

import { SheetState } from '../sheet-state';

/** The six attribute modifiers as a card in the sheet's header row, before the saves. */
@Component({
  selector: 'pio-sheet-attributes-block',
  imports: [AsyncData, AsyncPending, AsyncRegion, AttributesView, Surface],
  templateUrl: './sheet-attributes-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetAttributesBlock {
  protected readonly sheet = inject(SheetState);
  protected readonly picks = this.sheet.picks;
}
