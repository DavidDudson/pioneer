import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { PendingTransferView } from '@pioneer/campaign/domain';
import { AsyncButton, ListItem, Stack, Text } from '@pioneer/frontier';

import { CampaignTransferStore } from '../../data/campaign-transfer-store';
import { transferFailure } from '../../data/transfer-error';

/** The names the offer line and the accept confirmation say. */
interface OfferNames {
  readonly item: string;
  readonly giver: string;
  readonly recipient: string;
}

/**
 * One pending offer: the item, who offers it and to whom. The recipient's owner accepts, which names the item and the
 * giver and asks for a second press since the item moves for good, or declines; the giver's owner withdraws.
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

  protected readonly names = computed((): OfferNames => ({
    item: this.transfer().itemName,
    giver: this.transfer().fromName,
    recipient: this.transfer().toName,
  }));

  protected readonly accept = async (): Promise<void> => this.#store.accept(this.transfer().id);
  protected readonly decline = async (): Promise<void> => this.#store.decline(this.transfer().id);
  protected readonly withdraw = async (): Promise<void> => this.#store.withdraw(this.transfer().id);

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = transferFailure(error, 'campaign.transfers.answerFailed');
    return this.#i18n.translate(key, params);
  };
}
