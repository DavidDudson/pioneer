import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { PendingTransferView } from '@pioneer/campaign/domain';
import { List } from '@pioneer/frontier';

import { CampaignTransferRow } from '../campaign-transfer-row/campaign-transfer-row.component';

/**
 * The offers a party member's gift badge opens, one row each with the same accept, decline and withdraw buttons as
 * the offers panel. It sits under the whole party row and draws nothing while closed.
 */
@Component({
  selector: 'pio-campaign-party-offers',
  imports: [CampaignTransferRow, List],
  templateUrl: './campaign-party-offers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPartyOffers {
  public readonly open = input.required<boolean>();
  public readonly offers = input.required<readonly PendingTransferView[]>();
}
