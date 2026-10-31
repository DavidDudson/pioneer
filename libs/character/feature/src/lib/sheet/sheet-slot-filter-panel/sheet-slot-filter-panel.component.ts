import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Stack, Text, ToggleButton } from '@pioneer/frontier';
import { FacetFilterView } from '@pioneer/rules/ui';

import type { SlotFilter } from '../sheet-slot-filter';

/** The messages a panel shows: the toggle that shows everything, and what the preset keeps while it is in force. */
export interface SlotFilterMessages {
  readonly everything: string;
  readonly available: string;
}

export const FEAT_FILTER_MESSAGES: SlotFilterMessages = {
  everything: 'character.sheet.feats.everything',
  available: 'character.sheet.feats.available',
};

export const SPELL_FILTER_MESSAGES: SlotFilterMessages = {
  everything: 'character.sheet.prepared.everything',
  available: 'character.sheet.prepared.available',
};

/**
 * The filters of one slot's picker: a toggle that shows everything, a line saying what **Available to you**
 * keeps while that preset is in force, and the facet filters, whose every facet the player can change.
 */
@Component({
  selector: 'pio-sheet-slot-filter-panel',
  imports: [FacetFilterView, Stack, Text, ToggleButton, TranslocoPipe],
  templateUrl: './sheet-slot-filter-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetSlotFilterPanel {
  /** Undefined where the pickers are not filtered: the panel shows nothing. */
  public readonly filter = input.required<SlotFilter | undefined>();
  public readonly messages = input.required<SlotFilterMessages>();
}
