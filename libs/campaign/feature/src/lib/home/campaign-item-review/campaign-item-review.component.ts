import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncData, AsyncPending, AsyncRegion, Heading, Skeleton, Stack, Surface, Text } from '@pioneer/frontier';

import { CampaignItemReviewStore } from '../../data/campaign-item-review-store';
import { CampaignApprovedItems } from './campaign-approved-items.component';
import { CampaignNeedsReview } from './campaign-needs-review.component';

/** Skeleton rows shown while the items load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/**
 * The rule-breaking items of the open campaign's party. The GM sees the ones that need review and approves them, or
 * takes an approval back; every member sees the approved ones as approved by the GM. Approving never edits a
 * character: it only silences the warning, up to the count approved (ADR-0064).
 */
@Component({
  selector: 'pio-campaign-item-review',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    CampaignApprovedItems,
    CampaignNeedsReview,
    Heading,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-item-review.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignItemReviewPanel {
  protected readonly store = inject(CampaignItemReviewStore);

  protected readonly placeholders = PLACEHOLDERS;
}
