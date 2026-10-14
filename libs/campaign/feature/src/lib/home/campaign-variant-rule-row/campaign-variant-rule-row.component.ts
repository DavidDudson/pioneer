import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { CampaignId, VariantRuleOption } from '@pioneer/campaign/domain';
import { AsyncButton, Badge, ListItem, Stack, Text } from '@pioneer/frontier';
import { ApiError } from '@pioneer/shared/web';

import { CampaignStore } from '../../data/campaign-store';

/**
 * One variant rule of the packs the open campaign uses: its name and the pack that defines it, whether it is on, and
 * for the GM a button to turn it on or off. Both act on the first press, as the GM can undo either.
 */
@Component({
  selector: 'pio-campaign-variant-rule-row',
  imports: [AsyncButton, Badge, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-variant-rule-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignVariantRuleRow {
  public readonly rule = input.required<VariantRuleOption>();
  /** Whether the variant rule is in force. */
  public readonly on = input.required<boolean>();
  /** Whether the viewer may turn it on or off: the GM. */
  public readonly manageable = input.required<boolean>();

  readonly #store = inject(CampaignStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly enable = async (): Promise<void> =>
    this.#store.enableVariantRule(this.#campaignId(), this.rule().variantId);

  protected readonly disable = async (): Promise<void> =>
    this.#store.disableVariantRule(this.#campaignId(), this.rule().variantId);

  /** A variant rule that cannot be changed says why; anything else is a retry. */
  protected readonly describeError = (error: unknown): string => {
    if (ApiError.isConflict(error)) {
      const { key, params } = ApiError.describe(error);
      return this.#i18n.translate(key, params);
    }
    return this.#i18n.translate('campaign.variantRules.changeFailed');
  };

  #campaignId(): CampaignId {
    const campaign = this.#store.selected.data();
    if (campaign === undefined) {
      throw new Error('No campaign loaded');
    }
    return campaign.id;
  }
}
