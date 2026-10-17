import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  DescriptionItem,
  DescriptionList,
  Heading,
  Page,
  PageBody,
  PageHeader,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';

import { CampaignStore } from '../../data/campaign-store';
import { CampaignInvitePanel } from '../campaign-invite-panel/campaign-invite-panel.component';
import { CampaignItemReviewPanel } from '../campaign-item-review/campaign-item-review.component';
import { CampaignMemberList } from '../campaign-member-list/campaign-member-list.component';
import { CampaignPacksPanel } from '../campaign-packs/campaign-packs.component';
import { CampaignPartyPanel } from '../campaign-party/campaign-party.component';
import { CampaignRuleLimitsPanel } from '../campaign-rule-limits/campaign-rule-limits.component';
import { CampaignVariantRulesPanel } from '../campaign-variant-rules/campaign-variant-rules.component';

/** One campaign's home: when it started, who is in it, their characters, and for its GM, the invite links. */
@Component({
  selector: 'pio-campaign-home-page',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    CampaignInvitePanel,
    CampaignItemReviewPanel,
    CampaignMemberList,
    CampaignPacksPanel,
    CampaignPartyPanel,
    CampaignRuleLimitsPanel,
    CampaignVariantRulesPanel,
    DateDisplay,
    DescriptionItem,
    DescriptionList,
    Heading,
    Page,
    PageBody,
    PageHeader,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignHomePage {
  /** Route param, bound by `withComponentInputBinding`; the store validates it. */
  public readonly id = input.required<string>();

  protected readonly store = inject(CampaignStore);
  protected readonly title = computed(() => this.store.selected.data()?.name);

  public constructor() {
    effect(() => {
      this.store.select(this.id());
    });
  }
}
