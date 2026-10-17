import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ApprovedItem } from '@pioneer/campaign/domain';
import { Heading, List, Stack } from '@pioneer/frontier';

import { CampaignFlaggedItemRow } from '../campaign-flagged-item-row/campaign-flagged-item-row.component';

/** The flagged items the GM approved, which every member sees as approved by the GM. */
@Component({
  selector: 'pio-campaign-approved-items',
  imports: [CampaignFlaggedItemRow, Heading, List, Stack, TranslocoPipe],
  templateUrl: './campaign-approved-items.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignApprovedItems {
  public readonly items = input.required<readonly ApprovedItem[]>();
  /** Whether the viewer may revoke an approval: the GM. */
  public readonly manageable = input.required<boolean>();
}
