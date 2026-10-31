import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { PendingTransferView } from '@pioneer/campaign/domain';
import { AsyncButton, ListItem, Stack, Text } from '@pioneer/frontier';

import { CampaignTransferStore } from '../../data/campaign-transfer-store';
import { coinsText } from '../../data/coin-text';
import { transferFailure } from '../../data/transfer-error';

/** The names the offer line and the accept confirmation say; `item` is the item's name or the coins, as a short list. */
interface OfferNames {
  readonly item: string;
  readonly giver: string;
  readonly recipient: string;
}

/**
 * One pending offer: the item or coins, who offers it and to whom. The recipient's owner accepts, which names what moves
 * and the giver and asks for a second press since it moves for good, or declines; the giver's owner withdraws.
 */
@Component({
  selector: 'pio-campaign-transfer-row',
  imports: [AsyncButton, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-transfer-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignTransferRow {
  public readonly transfer = input.required<PendingTransferView>();

  readonly #store = inject(CampaignTransferStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly names = computed((): OfferNames => {
    const transfer = this.transfer();
    const say = (key: string, params: Readonly<Record<string, number>>): string => this.#i18n.translate(key, params);
    return {
      item: transfer.kind === 'coins' ? coinsText(transfer.coins, say, this.#i18n.getActiveLang()) : transfer.itemName,
      giver: transfer.fromName,
      recipient: transfer.toName,
    };
  });

  /** What comes with an offered container, as a list in the active language; empty for an offer that carries nothing. */
  protected readonly includes = computed((): string => {
    const transfer = this.transfer();
    const inside = transfer.kind === 'item' ? transfer.contents : [];
    return inside.length === 0 ? '' : new Intl.ListFormat(this.#i18n.getActiveLang()).format(inside);
  });

  protected readonly accept = async (): Promise<void> => this.#store.accept(this.transfer().id);
  protected readonly decline = async (): Promise<void> => this.#store.decline(this.transfer().id);
  protected readonly withdraw = async (): Promise<void> => this.#store.withdraw(this.transfer().id);

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = transferFailure(error, 'campaign.transfers.answerFailed');
    return this.#i18n.translate(key, params);
  };
}
