import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideKeyRound } from '@lucide/angular';
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

import { CampaignKeyItemStore } from '../../data/campaign-key-item-store';
import { CampaignKeyItemForm } from '../campaign-key-item-form/campaign-key-item-form.component';
import { CampaignKeyItemRow } from '../campaign-key-item-row/campaign-key-item-row.component';

/** Skeleton rows shown while the key items load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/**
 * The key items of the open campaign (ADR-0064): named, story-significant items such as Caliburn that the GM gives to
 * characters. Every member sees them and who holds them; the GM alone creates them, and gives, moves, takes back and
 * archives them. A key item may break the table limits and is never flagged.
 */
@Component({
  selector: 'pio-campaign-key-items',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    CampaignKeyItemForm,
    CampaignKeyItemRow,
    EmptyState,
    Heading,
    List,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-key-items.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignKeyItemsPanel {
  protected readonly store = inject(CampaignKeyItemStore);

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = LucideKeyRound;
}
