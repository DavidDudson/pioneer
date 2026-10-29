import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import type { Type } from '@angular/core';
import type { InventoryItemId } from '@pioneer/character/domain';

import { CharacterRuleLimitStore } from '../../../data/character-rule-limit-store';
import { CharacterStore } from '../../../data/character-store';
import { INVENTORY_LINE_OFFER } from '../../../data/inventory-line-offer';

/** The inputs the offer control takes. */
type OfferInputs = Readonly<Record<'campaign' | 'character' | 'line' | 'name', string>>;

/**
 * Beside a line of a character in a campaign: the campaign's control to offer it to another character. Shown for a
 * line the player owns outright; a key item's is the GM's. Nothing when the app provides no control, the character is
 * in no campaign, or the control fails to load.
 */
@Component({
  selector: 'pio-item-offer',
  imports: [NgComponentOutlet],
  templateUrl: './item-offer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemOffer {
  public readonly id = input.required<InventoryItemId>();
  public readonly name = input.required<string>();

  readonly #loader = inject(INVENTORY_LINE_OFFER);
  readonly #characters = inject(CharacterStore);
  readonly #limits = inject(CharacterRuleLimitStore);

  protected readonly control = signal<Type<unknown> | undefined>(undefined);
  protected readonly inputs = computed((): OfferInputs | undefined => {
    const character = this.#characters.selected();
    const { campaign } = this.#limits.rules();
    const line = character?.document.inventory.items.find((each) => each.id === this.id());
    return character === undefined || campaign === undefined || line === undefined || line.keyItem !== undefined
      ? undefined
      : { campaign, character: character.id, line: line.id, name: this.name() };
  });

  public constructor() {
    effect(() => {
      if (this.inputs() !== undefined && this.control() === undefined) {
        // oxlint-disable-next-line typescript/no-floating-promises -- #load catches every error, so it never rejects
        this.#load();
      }
    });
  }

  async #load(): Promise<void> {
    try {
      this.control.set(await this.#loader?.());
    } catch {
      // No offer control this visit.
    }
  }
}
