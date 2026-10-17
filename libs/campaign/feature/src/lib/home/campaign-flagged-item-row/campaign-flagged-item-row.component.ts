import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ItemRule } from '@pioneer/campaign/domain';
import type { ApprovedItem, FlaggedItem } from '@pioneer/campaign/domain';
import { AsyncButton, Badge, ListItem, Stack, Text } from '@pioneer/frontier';

import { CampaignItemReviewStore } from '../../data/campaign-item-review-store';
import { CampaignKeyItemStore } from '../../data/campaign-key-item-store';

/** The names the promote confirmation says. */
interface PromoteNames {
  readonly item: string;
  readonly character: string;
}

/** Each rule's reason, said in words. */
const RULE_REASONS: Readonly<Record<ItemRule, string>> = {
  [ItemRule.Invested]: 'campaign.itemReview.rule.invested',
  [ItemRule.Hands]: 'campaign.itemReview.rule.hands',
  [ItemRule.PropertyRunes]: 'campaign.itemReview.rule.propertyRunes',
  [ItemRule.RuneNotAllowed]: 'campaign.itemReview.rule.runeNotAllowed',
};

/**
 * One rule a party member's item breaks: whose item, the reason, and for the GM buttons that approve it or make it a
 * key item, or for an approved one that takes the approval back. Everyone sees an approved item as approved by the GM
 * (ADR-0064).
 */
@Component({
  selector: 'pio-campaign-flagged-item-row',
  imports: [AsyncButton, Badge, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-flagged-item-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignFlaggedItemRow {
  public readonly item = input.required<FlaggedItem>();
  /** The approval that covers it; absent while it needs review. */
  public readonly approval = input<ApprovedItem['approval']>();
  /** Whether the viewer may approve or revoke: the GM. */
  public readonly manageable = input.required<boolean>();

  readonly #store = inject(CampaignItemReviewStore);
  readonly #keyItems = inject(CampaignKeyItemStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly reason = computed((): string => RULE_REASONS[this.item().rule]);

  protected readonly reasonParams = computed(() => ({
    count: this.item().count,
    rune: this.item().runeName ?? '',
  }));

  protected readonly approve = async (): Promise<void> => {
    const { character, item, rule, rune } = this.item();
    return this.#store.approve({ character, item, rule, rune });
  };

  protected readonly confirmPromote = computed((): PromoteNames => ({
    item: this.item().itemName,
    character: this.item().characterName,
  }));

  protected readonly promote = async (): Promise<void> => {
    const { character, item, rule, rune } = this.item();
    return this.#keyItems.promote({ character, item, rule, rune });
  };

  protected readonly describePromoteError = (): string => this.#i18n.translate('campaign.itemReview.promoteFailed');

  protected readonly revoke = async (): Promise<void> => {
    const approval = this.approval();
    if (approval !== undefined) {
      await this.#store.revoke(approval);
    }
  };

  protected readonly describeError = (): string => this.#i18n.translate('campaign.itemReview.changeFailed');
}
