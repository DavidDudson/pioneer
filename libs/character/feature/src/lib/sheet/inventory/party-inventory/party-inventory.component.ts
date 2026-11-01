import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import type { Type } from '@angular/core';

import { CharacterRuleLimitStore } from '../../../data/character-rule-limit-store';
import { CharacterStore } from '../../../data/character-store';
import { PARTY_INVENTORY } from '../../../data/party-inventory';

/** A line of the character's that may go in the Party Inventory, by the name its row shows. */
interface DepositableLine {
  readonly id: string;
  readonly name: string;
}

/** The inputs the container takes: the campaign, the character and the lines that may go in. */
type ContainerInputs = Readonly<{
  campaign: string;
  character: string;
  lines: readonly DepositableLine[];
}>;

/**
 * Beside the character's own inventory: the campaign's Party Inventory, shown even when it is empty (ADR-0076). Nothing
 * when the app provides no container, the character is in no campaign, or the container fails to load. The lines that
 * may go in are the loose ones that are not key items: a line inside a container goes with its container, and the GM
 * controls a key item. What the party holds adds Bulk to no one, so the sheet's Bulk never reads it.
 */
@Component({
  selector: 'pio-party-inventory',
  imports: [NgComponentOutlet],
  templateUrl: './party-inventory.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartyInventory {
  /** Each line of the character by the name its row shows. */
  public readonly names = input.required<ReadonlyMap<string, string>>();

  readonly #loader = inject(PARTY_INVENTORY);
  readonly #characters = inject(CharacterStore);
  readonly #limits = inject(CharacterRuleLimitStore);

  protected readonly control = signal<Type<unknown> | undefined>(undefined);
  protected readonly inputs = computed((): ContainerInputs | undefined => {
    const character = this.#characters.selected();
    const { campaign } = this.#limits.rules();
    if (character === undefined || campaign === undefined) {
      return undefined;
    }
    const names = this.names();
    const lines = character.document.inventory.items
      .filter((line) => line.container === undefined && line.keyItem === undefined)
      .map((line): DepositableLine => ({ id: line.id, name: names.get(line.id) ?? line.id }));
    return { campaign, character: character.id, lines };
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
      // No Party Inventory this visit.
    }
  }
}
