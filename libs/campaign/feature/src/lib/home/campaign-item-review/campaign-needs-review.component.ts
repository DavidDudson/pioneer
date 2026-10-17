import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { FlaggedItem } from '@pioneer/campaign/domain';
import { Heading, List, Stack, Text } from '@pioneer/frontier';

import { CampaignFlaggedItemRow } from '../campaign-flagged-item-row/campaign-flagged-item-row.component';

/** The flagged items no approval covers, for the GM to approve one by one. */
@Component({
  selector: 'pio-campaign-needs-review',
  imports: [CampaignFlaggedItemRow, Heading, List, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-needs-review.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignNeedsReview {
  public readonly items = input.required<readonly FlaggedItem[]>();
}
