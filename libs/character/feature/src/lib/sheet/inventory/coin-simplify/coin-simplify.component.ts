import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { canSimplify, CharacterPatchField } from '@pioneer/character/domain';
import { AsyncButton, Stack, Text } from '@pioneer/frontier';

import { CharacterStore } from '../../../data/character-store';
import { describeSaveError } from '../../sheet-field';

/** Names why Simplify is off: no coin can be traded up. */
const NOTHING_TO_TRADE_ID = 'pio-coin-simplify-nothing';

/**
 * Simplify, under the coins: trades small coins up into larger ones (10 cp to 1 sp, 10 sp to 1 gp, 10 gp to 1 pp) as a
 * `simplifyCoins`, the value unchanged. Disabled, with the reason, when nothing can be traded up.
 */
@Component({
  selector: 'pio-coin-simplify',
  imports: [AsyncButton, Stack, Text, TranslocoPipe],
  templateUrl: './coin-simplify.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinSimplify {
  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly nothingToTradeId = NOTHING_TO_TRADE_ID;
  /** Whether any coin can be traded up; false while the character loads, when the button is off anyway. */
  protected readonly tradable: Signal<boolean> = computed(() => {
    const coins = this.#store.selected()?.document.inventory.coins;

    return coins !== undefined && canSimplify(coins);
  });

  protected readonly simplify = async (): Promise<void> => {
    await this.#store.patch({ field: CharacterPatchField.SimplifyCoins });
  };

  /** The server's reason (a conflict, nothing left to trade), else the sheet's own wording. */
  protected readonly describeError = (error: Error): string => {
    const { key, params } = describeSaveError(error);

    return this.#i18n.translate(key, params);
  };
}
