import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucidePackage } from '@lucide/angular';
import type { PartyStash } from '@pioneer/campaign/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  EmptyState,
  Heading,
  List,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';

import { CampaignPartyStashStore } from '../../data/campaign-party-stash-store';
import { CampaignPartyStashLine } from '../campaign-party-stash-line/campaign-party-stash-line.component';

/** Skeleton rows shown while the stash loads. */
const PLACEHOLDERS = ['first', 'second'] as const;

/** The name of the container a line is inside, or none for a loose line. */
function containerName(stash: PartyStash, line: PartyStash['lines'][number]): string {
  return stash.lines.find((each) => each.id === line.container)?.name ?? '';
}

/**
 * The party stash (ADR-0064): one flat container the whole party shares. Every member sees what it holds; a member
 * puts a line in from their character's sheet, and takes one out here into any of their own characters. It adds Bulk to
 * no one while it holds a thing. A line is read again after each move and when the window is focused again.
 */
@Component({
  selector: 'pio-campaign-party-stash',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    CampaignPartyStashLine,
    EmptyState,
    Heading,
    List,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-party-stash.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPartyStashPanel {
  protected readonly store = inject(CampaignPartyStashStore);

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = LucidePackage;

  protected readonly containerName = containerName;
}
