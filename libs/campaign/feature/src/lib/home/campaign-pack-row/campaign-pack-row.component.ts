import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { CampaignId, EnabledPack, EnabledPackId } from '@pioneer/campaign/domain';
import { AsyncButton, Badge, ListItem, Stack, Text } from '@pioneer/frontier';
import { ApiError } from '@pioneer/shared/web';

import { CampaignStore } from '../../data/campaign-store';

/**
 * One pack the open campaign uses: its title and publisher, whether it is always on, what needs it, and for the GM a
 * Disable button where the pack may be turned off. Disabling acts on the first press, as the GM can enable it again.
 */
@Component({
  selector: 'pio-campaign-pack-row',
  imports: [AsyncButton, Badge, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-pack-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPackRow {
  public readonly pack = input.required<EnabledPack>();
  /** Disabled since the list loaded: the row stays, marked, so the focused button and its tick survive. */
  public readonly disabled = input(false);
  /** The pack was disabled from here. */
  public readonly turnedOff = output<EnabledPackId>();

  readonly #store = inject(CampaignStore);
  readonly #i18n = inject(TranslocoService);

  /** A pack another enabled pack still extends says so; anything else is a retry. */
  protected readonly describeDisableError = (error: unknown): string => {
    if (ApiError.isConflict(error)) {
      const { key, params } = ApiError.describe(error);
      return this.#i18n.translate(key, params);
    }
    return this.#i18n.translate('campaign.packs.disableFailed');
  };

  protected readonly disable = async (): Promise<void> => {
    const { packId } = this.pack();
    await this.#store.disablePack(this.#campaignId(), packId);
    this.turnedOff.emit(packId);
  };

  #campaignId(): CampaignId {
    const campaign = this.#store.selected.data();
    if (campaign === undefined) {
      throw new Error('No campaign loaded');
    }
    return campaign.id;
  }
}
