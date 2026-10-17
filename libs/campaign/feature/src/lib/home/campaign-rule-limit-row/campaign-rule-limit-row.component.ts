import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RuleLimitKey, RuleLimitValue } from '@pioneer/campaign/domain';
import type { RuleLimitSetting } from '@pioneer/campaign/domain';
import { AsyncButton, Badge, InlineEdit, InlineField, ListItem, NumberInput, Stack, Text } from '@pioneer/frontier';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { ApiError } from '@pioneer/shared/web';

import { CampaignRuleLimitStore } from '../../data/campaign-rule-limit-store';

/** Each limit's label. */
const LIMIT_LABELS: Readonly<Record<RuleLimitKey, string>> = {
  [RuleLimitKey.InvestedMax]: 'campaign.ruleLimits.investedMax',
  [RuleLimitKey.HandsMax]: 'campaign.ruleLimits.handsMax',
  [RuleLimitKey.PropertyRunesPerGrade]: 'campaign.ruleLimits.propertyRunesPerGrade',
  [RuleLimitKey.ItemsMax]: 'campaign.ruleLimits.itemsMax',
};

/** Draft placeholder while the limits load; never shown, as editing waits for them. */
const NO_LIMIT = RuleLimitValue.parse(1);

/**
 * One table limit of the open campaign: its name, the number in force and, for the GM, an inline edit for the number
 * and a button that returns it to the core rules' number. A number past the limit's ceiling is refused by the server
 * and shown under the field.
 */
@Component({
  selector: 'pio-campaign-rule-limit-row',
  imports: [AsyncButton, Badge, InlineField, ListItem, NumberInput, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-rule-limit-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignRuleLimitRow {
  public readonly setting = input.required<RuleLimitSetting>();
  /** Whether the viewer may change the limit: the GM. */
  public readonly manageable = input.required<boolean>();

  readonly #store = inject(CampaignRuleLimitStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly label = computed((): string => LIMIT_LABELS[this.setting().limit]);

  protected readonly edit = new InlineEdit<number>({
    source: computed((): number => this.setting().value),
    empty: NO_LIMIT,
    schema: RuleLimitValue,
    save: async (value: number): Promise<void> => this.#store.set(this.setting().limit, RuleLimitValue.parse(value)),
    isConflict: (error: unknown): boolean => ApiError.isConflict(error),
    describeError: (error: unknown): MessageDescriptor => ApiError.describe(error),
  });

  protected readonly reset = async (): Promise<void> => this.#store.reset(this.setting().limit);

  protected readonly describeError = (): string => this.#i18n.translate('campaign.ruleLimits.changeFailed');
}
