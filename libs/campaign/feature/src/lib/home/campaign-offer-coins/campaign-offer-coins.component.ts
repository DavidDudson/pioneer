import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CampaignContract, CampaignId, CharacterId, OfferedCoinsSchema } from '@pioneer/campaign/domain';
import type { CampaignParty, OfferedCoins, PartyCharacter } from '@pioneer/campaign/domain';
import { AsyncButton, Disclosure, Grid, Message, NumberInput, Stack, Text } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import type { CoinCounts } from '../../data/coin-text';
import { transferFailure } from '../../data/transfer-error';
import { otherRecipients, recipientColumns, recipientLabel, recipientValue } from '../recipient-picker';

/** One denomination's field: its key in the purse and the label to read it by, largest first. */
interface CoinField {
  readonly coin: keyof OfferedCoins;
  readonly label: string;
}

const FIELDS: readonly CoinField[] = [
  { coin: 'pp', label: 'campaign.transfers.coinLabel.pp' },
  { coin: 'gp', label: 'campaign.transfers.coinLabel.gp' },
  { coin: 'sp', label: 'campaign.transfers.coinLabel.sp' },
  { coin: 'cp', label: 'campaign.transfers.coinLabel.cp' },
];

const NOTHING: CoinCounts = { pp: 0, gp: 0, sp: 0, cp: 0 };

/**
 * Beside a character's coins in a campaign (ADR-0064): offers an amount, counted per denomination and up to what the
 * purse holds, to another character of the party picked from a table (ADR-0054). The sheet's page provides it through
 * `PURSE_OFFER`, outside the campaign routes, so it reads the party and makes the offer itself. The coins stay with the
 * giver until the recipient's owner accepts.
 */
@Component({
  selector: 'pio-campaign-offer-coins',
  imports: [AsyncButton, Disclosure, Grid, Message, NumberInput, Picker, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-offer-coins.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignOfferCoins {
  /** The character's campaign, as the sheet knows it. */
  public readonly campaign = input.required<string>();
  /** The giver. */
  public readonly character = input.required<string>();
  /** The coins the giver holds now, which cap the offer. */
  public readonly purse = input.required<CoinCounts>();

  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #i18n = inject(TranslocoService);

  protected readonly fields = FIELDS;
  protected readonly open = signal(false);
  protected readonly chosen = signal<string | undefined>(undefined);
  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);
  protected readonly amounts = signal<CoinCounts>(NOTHING);

  /** The party, read once the disclosure is opened. */
  protected readonly party = injectQuery(() => ({
    queryKey: ['campaigns', 'party', this.campaign()],
    queryFn: async (): Promise<CampaignParty> =>
      this.#api.call(CampaignContract.party, { params: { id: CampaignId.parse(this.campaign()) }, body: undefined }),
    enabled: this.open(),
  }));

  protected readonly columns = computed(() => recipientColumns((key) => this.#i18n.translate(key)));

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

  /** Nothing to press until a recipient is picked and at least one coin is counted, none of them above the purse. */
  protected readonly idle = computed((): boolean => {
    const amounts = this.amounts();
    const held = this.purse();
    const counted = FIELDS.some(({ coin }) => amounts[coin] > 0);
    const within = FIELDS.every(({ coin }) => amounts[coin] <= held[coin]);
    return this.chosen() === undefined || !counted || !within;
  });

  protected readonly count = (coin: keyof OfferedCoins, value: number): void => {
    this.amounts.update((amounts) => ({ ...amounts, [coin]: Math.max(0, Math.trunc(value)) }));
  };

  protected readonly offer = async (): Promise<void> => {
    const to = this.chosen();
    if (to === undefined) {
      return;
    }
    const id = CampaignId.parse(this.campaign());
    const body = {
      from: CharacterId.parse(this.character()),
      to: CharacterId.parse(to),
      coins: OfferedCoinsSchema.parse(this.amounts()),
    };
    await this.#api.call(CampaignContract.offerCoins, { params: { id }, body });
    this.chosen.set(undefined);
    this.amounts.set(NOTHING);
    await this.#client.invalidateQueries({ queryKey: ['campaigns', 'transfers', id] });
  };

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = transferFailure(error, 'campaign.transfers.offerFailed');
    return this.#i18n.translate(key, params);
  };
}
