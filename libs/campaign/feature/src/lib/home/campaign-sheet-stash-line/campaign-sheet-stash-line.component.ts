import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CampaignContract, CampaignId, CharacterId } from '@pioneer/campaign/domain';
import type { PartyStashLine } from '@pioneer/campaign/domain';
import { AsyncButton, ListItem, Stack, Text } from '@pioneer/frontier';
import { ApiClient } from '@pioneer/shared/web';
import { QueryClient } from '@tanstack/angular-query-experimental';

import { partyStashKey } from '../../data/campaign-party-stash-store';
import { transferFailure } from '../../data/transfer-error';

/**
 * One line of the Party Inventory on a character's sheet (ADR-0076): what it is, how many, and a button for the sheet's
 * own character to take it, with what it holds. A line inside a container is not taken alone: it comes with its
 * container, so only a loose line has the button. Any member may take any loose line; the stash has no lock.
 */
@Component({
  selector: 'pio-campaign-sheet-stash-line',
  imports: [AsyncButton, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-sheet-stash-line.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignSheetStashLine {
  public readonly campaign = input.required<string>();
  /** The character that takes the line. */
  public readonly character = input.required<string>();
  public readonly line = input.required<PartyStashLine>();
  /** The name of the container the line is inside; empty for a loose line. */
  public readonly inside = input<string>('');

  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #i18n = inject(TranslocoService);

  protected readonly loose = computed((): boolean => this.line().container === undefined);

  protected readonly take = async (): Promise<void> => {
    const id = CampaignId.parse(this.campaign());
    const body = { to: CharacterId.parse(this.character()), item: this.line().id };
    await this.#api.call(CampaignContract.takeFromPartyStash, { params: { id }, body });
    await this.#client.invalidateQueries({ queryKey: partyStashKey(id) });
    // The character gained the line, so the sheet reads it again.
    await this.#client.invalidateQueries({ queryKey: ['characters'] });
  };

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = transferFailure(error, 'campaign.partyStash.takeFailed');
    return this.#i18n.translate(key, params);
  };
}
