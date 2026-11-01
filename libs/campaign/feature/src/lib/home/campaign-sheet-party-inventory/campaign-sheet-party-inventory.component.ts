import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CampaignContract, CampaignId, CharacterId, ReviewedItemId } from '@pioneer/campaign/domain';
import type { PartyStash, PartyStashLine } from '@pioneer/campaign/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Heading,
  List,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';
import { Picker, tableSchema } from '@pioneer/frontier/data';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { partyStashKey } from '../../data/campaign-party-stash-store';
import { transferFailure } from '../../data/transfer-error';
import { CampaignSheetStashLine } from '../campaign-sheet-stash-line/campaign-sheet-stash-line.component';

/** A line of the character's own the party stash can take: its id and the name the sheet shows for it. */
interface DepositableLine {
  readonly id: string;
  readonly name: string;
}

/** Skeleton rows shown while the stash loads. */
const PLACEHOLDERS = ['first', 'second'] as const;

/** The name of the container a line is inside, or none for a loose line. */
function containerName(stash: PartyStash, line: PartyStashLine): string {
  return stash.lines.find((each) => each.id === line.container)?.name ?? '';
}

const rowValue = (row: DepositableLine): string => row.id;
const rowLabel = (row: DepositableLine): string => row.name;

/**
 * The Party Inventory on a character's sheet (ADR-0076), beside the character's own inventory and shown even when it
 * is empty. The character takes any loose line from it with no lock, and puts one of its own lines in, with what the
 * line holds. What it holds adds Bulk to no one. The sheet provides it through `PARTY_INVENTORY`, outside the campaign
 * routes, and hands it the lines that may go in (loose, not key items), so it reads the stash and moves lines itself.
 */
@Component({
  selector: 'pio-campaign-sheet-party-inventory',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    CampaignSheetStashLine,
    Heading,
    List,
    Picker,
    Skeleton,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-sheet-party-inventory.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignSheetPartyInventory {
  /** The character's campaign, as the sheet knows it. */
  public readonly campaign = input.required<string>();
  /** The character that takes from the stash and puts into it. */
  public readonly character = input.required<string>();
  /** The character's lines that may be put in the stash. */
  public readonly lines = input.required<readonly DepositableLine[]>();

  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #i18n = inject(TranslocoService);

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly chosen = signal<string | undefined>(undefined);
  protected readonly query = signal('');
  protected readonly containerName = containerName;
  protected readonly rowValue = rowValue;
  protected readonly rowLabel = rowLabel;

  protected readonly stash = injectQuery(() => {
    const id = CampaignId.parse(this.campaign());
    return {
      queryKey: partyStashKey(id),
      queryFn: async (): Promise<PartyStash> =>
        this.#api.call(CampaignContract.partyStash, { params: { id }, body: undefined }),
    };
  });

  protected readonly columns = computed(() =>
    tableSchema<DepositableLine>()
      .addText({ id: 'name', header: this.#i18n.translate('campaign.partyStash.lineName'), value: (row) => row.name })
      .build(),
  );

  /** The lines whose name holds the search typed. */
  protected readonly rows = computed((): readonly DepositableLine[] => {
    const needle = this.query().trim().toLocaleLowerCase();
    return this.lines().filter((each) => each.name.toLocaleLowerCase().includes(needle));
  });

  protected readonly idle = computed((): boolean => this.chosen() === undefined);

  protected readonly deposit = async (): Promise<void> => {
    const item = this.chosen();
    if (item === undefined) {
      return;
    }
    const id = CampaignId.parse(this.campaign());
    const body = { from: CharacterId.parse(this.character()), item: ReviewedItemId.parse(item) };
    await this.#api.call(CampaignContract.depositToPartyStash, { params: { id }, body });
    this.chosen.set(undefined);
    await this.#client.invalidateQueries({ queryKey: partyStashKey(id) });
    // The character lost the line, so the sheet reads it again.
    await this.#client.invalidateQueries({ queryKey: ['characters'] });
  };

  protected readonly describeDepositError = (error: unknown): string => {
    const { key, params } = transferFailure(error, 'campaign.partyStash.putFailed');
    return this.#i18n.translate(key, params);
  };
}
