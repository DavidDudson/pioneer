import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CampaignContract, CharacterId, CampaignId, ReviewedItemId } from '@pioneer/campaign/domain';
import type { CampaignParty, PartyCharacter } from '@pioneer/campaign/domain';
import { AsyncButton, Disclosure, Message, Stack, Text } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { transferFailure } from '../../data/transfer-error';
import { otherRecipients, recipientColumns, recipientLabel, recipientValue } from '../recipient-picker';

/**
 * Beside an inventory line of a character in a campaign (ADR-0064): offers the line to another character of the party,
 * picked from a table (ADR-0054). The sheet's page provides it through `INVENTORY_LINE_OFFER`, outside the campaign
 * routes, so it reads the party and makes the offer itself. The line stays with the giver until the recipient's owner
 * accepts.
 */
@Component({
  selector: 'pio-campaign-offer-item',
  imports: [AsyncButton, Disclosure, Message, Picker, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-offer-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignOfferItem {
  /** The character's campaign, as the sheet knows it. */
  public readonly campaign = input.required<string>();
  /** The giver. */
  public readonly character = input.required<string>();
  /** The inventory line on offer. */
  public readonly line = input.required<string>();
  /** What the line is called, for the labels. */
  public readonly name = input.required<string>();

  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #i18n = inject(TranslocoService);

  protected readonly open = signal(false);
  protected readonly chosen = signal<string | undefined>(undefined);
  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);

  /** The party, read once the disclosure is opened. */
  protected readonly party = injectQuery(() => ({
    queryKey: ['campaigns', 'party', this.campaign()],
    queryFn: async (): Promise<CampaignParty> =>
      this.#api.call(CampaignContract.party, { params: { id: CampaignId.parse(this.campaign()) }, body: undefined }),
    enabled: this.open(),
  }));

  protected readonly columns = computed(() => recipientColumns((key) => this.#i18n.translate(key)));

  /** The other live characters of the party whose name holds the search, in the order asked for. */
  protected readonly rows = computed((): readonly PartyCharacter[] =>
    otherRecipients({
      party: this.party.data()?.characters ?? [],
      giver: this.character(),
      search: this.query(),
      sort: this.sorting(),
    }),
  );

  protected readonly rowValue = recipientValue;
  protected readonly rowLabel = recipientLabel;
  protected readonly idle = computed((): boolean => this.chosen() === undefined);

  protected readonly offer = async (): Promise<void> => {
    const to = this.chosen();
    if (to === undefined) {
      return;
    }
    const id = CampaignId.parse(this.campaign());
    const body = {
      from: CharacterId.parse(this.character()),
      to: CharacterId.parse(to),
      item: ReviewedItemId.parse(this.line()),
    };
    await this.#api.call(CampaignContract.offerItem, { params: { id }, body });
    this.chosen.set(undefined);
    await this.#client.invalidateQueries({ queryKey: ['campaigns', 'transfers', id] });
  };

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = transferFailure(error, 'campaign.transfers.offerFailed');
    return this.#i18n.translate(key, params);
  };
}
