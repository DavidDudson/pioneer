import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { RunedContent } from '@pioneer/character/domain';

import { ItemAuthorized } from '../item-authorized/item-authorized.component';
import { ItemCoating } from '../item-coating/item-coating.component';
import { ItemDonning } from '../item-donning/item-donning.component';
import { ItemRelease } from '../item-release/item-release.component';
import { ItemReservoir } from '../item-reservoir/item-reservoir.component';
import { ItemShift } from '../item-shift/item-shift.component';

/** The state runes keep on one inventory item: its shape, whether it is set free, and what its coating space spell reservoir hold, who an authorized weapon is etched for, and the actions a ready rune makes armour take to don. */
@Component({
  selector: 'pio-item-rune-states',
  imports: [ItemAuthorized, ItemCoating, ItemDonning, ItemRelease, ItemReservoir, ItemShift],
  templateUrl: './item-rune-states.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemRuneStates {
  /** The inventory item's id, as the line carries it. */
  public readonly id = input.required<string>();
  /** The name the line shows, for the labels. */
  public readonly name = input.required<string>();
  /** The items and runes the loaded packs offer. */
  public readonly content = input.required<RunedContent>();
}
