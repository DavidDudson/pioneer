import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CustomItem } from '@pioneer/character/domain';
import { Badge, BadgeTone, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';

import { CharacterStore } from '../../../data/character-store';
import { ItemRemove } from '../item-remove/item-remove.component';

/**
 * The items an import kept by name because no loaded content has them (#310 feat(interop): import Pathbuilder
 * inventory, runes and coins). They weigh nothing and can be removed once the player has replaced them with content.
 * Nothing shows when there are none.
 */
@Component({
  selector: 'pio-custom-items',
  imports: [Badge, Heading, ItemRemove, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './custom-items.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomItems {
  readonly #store = inject(CharacterStore);

  protected readonly Tone = BadgeTone;

  protected readonly items: Signal<readonly CustomItem[]> = computed(
    () => this.#store.selected()?.document.inventory.customItems ?? [],
  );
}
