import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import type { Type } from '@angular/core';
import { Coin } from '@pioneer/rules/sdk';

import { CharacterRuleLimitStore } from '../../../data/character-rule-limit-store';
import { CharacterStore } from '../../../data/character-store';
import { PURSE_OFFER } from '../../../data/purse-offer';

/** The inputs the offer control takes: the campaign, the giver and the coins held per denomination. */
type OfferInputs = Readonly<{
  campaign: string;
  character: string;
  purse: Readonly<Record<Coin, number>>;
}>;

/**
 * Beside the coins of a character in a campaign: the campaign's control to offer some of them to another character.
 * Nothing when the app provides no control, the character is in no campaign, the purse is empty, or the control fails
 * to load.
 */
@Component({
  selector: 'pio-coin-offer',
  imports: [NgComponentOutlet],
  templateUrl: './coin-offer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinOffer {
  readonly #loader = inject(PURSE_OFFER);
  readonly #characters = inject(CharacterStore);
  readonly #limits = inject(CharacterRuleLimitStore);

  protected readonly control = signal<Type<unknown> | undefined>(undefined);
  protected readonly inputs = computed((): OfferInputs | undefined => {
    const character = this.#characters.selected();
    const { campaign } = this.#limits.rules();
    if (character === undefined || campaign === undefined) {
      return undefined;
    }
    const purse = character.document.inventory.coins;
    const held = Object.values(Coin).some((coin) => purse[coin] > 0);
    return held ? { campaign, character: character.id, purse } : undefined;
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
