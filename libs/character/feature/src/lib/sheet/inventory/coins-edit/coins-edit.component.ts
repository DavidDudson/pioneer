import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterPatchField, CoinAmount } from '@pioneer/character/domain';
import type { InlineEdit } from '@pioneer/frontier';
import { Grid, InlineField, LocaleFormat, NumberInput } from '@pioneer/frontier';
import { Coin } from '@pioneer/rules/sdk';

import { CharacterStore } from '../../../data/character-store';
import { sheetField } from '../../sheet-field';

/** Each coin's label, largest first. */
const COIN_LABELS: Readonly<Record<Coin, string>> = {
  [Coin.Platinum]: 'character.sheet.inventory.coin.pp',
  [Coin.Gold]: 'character.sheet.inventory.coin.gp',
  [Coin.Silver]: 'character.sheet.inventory.coin.sp',
  [Coin.Copper]: 'character.sheet.inventory.coin.cp',
};

/** One coin's inline edit and its label. */
interface CoinField {
  readonly coin: Coin;
  readonly label: string;
  readonly edit: InlineEdit<number>;
}

/** The character's coins, one inline edit per coin; a save sends the whole purse with that coin changed. */
@Component({
  selector: 'pio-coins-edit',
  imports: [Grid, InlineField, NumberInput, TranslocoPipe],
  templateUrl: './coins-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinsEdit {
  readonly #store = inject(CharacterStore);
  readonly #format = inject(LocaleFormat);

  protected readonly fields: readonly CoinField[] = Object.values(Coin).map((coin) => ({
    coin,
    label: COIN_LABELS[coin],
    edit: sheetField<number>(this.#store.selected, {
      read: (character) => character.document.inventory.coins[coin],
      empty: 0,
      schema: CoinAmount,
      save: async (value) => this.#save(coin, value),
      format: (value) => this.#format.number(value),
    }),
  }));

  async #save(coin: Coin, value: number): Promise<void> {
    const purse = this.#store.selected()?.document.inventory.coins;
    if (purse === undefined) {
      return;
    }
    await this.#store.patch({
      field: CharacterPatchField.SetCoins,
      coins: { ...purse, [coin]: CoinAmount.parse(value) },
    });
  }
}
