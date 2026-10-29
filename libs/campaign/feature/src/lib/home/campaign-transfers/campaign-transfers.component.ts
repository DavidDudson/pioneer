import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideHandHeart } from '@lucide/angular';
import type { PendingTransfers } from '@pioneer/campaign/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  EmptyState,
  Heading,
  List,
  Message,
  Skeleton,
  Stack,
  Surface,
} from '@pioneer/frontier';

import { CampaignTransferStore } from '../../data/campaign-transfer-store';
import { CampaignTransferRow } from '../campaign-transfer-row/campaign-transfer-row.component';

/** Skeleton rows shown while the offers load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/** How many of the offers wait for the viewer to accept or decline them. */
function incomingCount(transfers: PendingTransfers): number {
  return transfers.filter((transfer) => transfer.asRecipient).length;
}

/**
 * The pending item offers that involve the viewer's characters (ADR-0064): the ones to answer, with accept and decline,
 * and the ones made, with withdraw. A line says how many wait for an answer, which screen readers announce when it
 * changes. The list is read again after each answer and when the window is focused again (ADR-0018 has no stream).
 */
@Component({
  selector: 'pio-campaign-transfers',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    CampaignTransferRow,
    EmptyState,
    Heading,
    List,
    Message,
    Skeleton,
    Stack,
    Surface,
    TranslocoPipe,
  ],
  templateUrl: './campaign-transfers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignTransfersPanel {
  protected readonly store = inject(CampaignTransferStore);

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = LucideHandHeart;

  protected readonly incoming = incomingCount;
}
