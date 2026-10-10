import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CampaignRole } from '@pioneer/campaign/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Avatar,
  Badge,
  DateDisplay,
  Heading,
  List,
  ListItem,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';

import { CampaignStore } from '../../data/campaign-store';

/** Message key for each role's badge. */
const ROLE_LABEL = {
  [CampaignRole.Gm]: 'campaign.roster.gm',
  [CampaignRole.Player]: 'campaign.roster.player',
} as const satisfies Record<CampaignRole, string>;

/** Skeleton rows shown while the members load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/** The open campaign's members, oldest first, with their role and when they joined. */
@Component({
  selector: 'pio-campaign-member-list',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Avatar,
    Badge,
    DateDisplay,
    Heading,
    List,
    ListItem,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-member-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignMemberList {
  protected readonly store = inject(CampaignStore);
  protected readonly placeholders = PLACEHOLDERS;

  protected readonly roleLabel = ROLE_LABEL;
}
