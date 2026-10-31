import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Stack, Text, ToggleButton } from '@pioneer/frontier';
import { FacetFilterView } from '@pioneer/rules/ui';

import type { FeatSlotFilter } from '../sheet-feat-slot-filter';

/**
 * The filters of one feat slot's picker: a toggle that shows every feat, a line saying what **Available to you**
 * keeps while that preset is in force, and the facet filters, whose every facet the player can change.
 */
@Component({
  selector: 'pio-sheet-feat-filter-panel',
  imports: [FacetFilterView, Stack, Text, ToggleButton, TranslocoPipe],
  templateUrl: './sheet-feat-filter-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFeatFilterPanel {
  /** Undefined where the pickers are not filtered: the panel shows nothing. */
  public readonly filter = input.required<FeatSlotFilter | undefined>();
}
