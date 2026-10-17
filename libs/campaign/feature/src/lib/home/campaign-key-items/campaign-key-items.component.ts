import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideKeyRound } from '@lucide/angular';
import type { KeyItemView } from '@pioneer/campaign/domain';
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
import { ALL_HOLDERS, filterKeyItems } from '../../data/key-item-filter';
import { CampaignKeyItemFilter } from '../campaign-key-item-filter/campaign-key-item-filter.component';
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
    CampaignKeyItemFilter,
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
  /** The holder the list is narrowed to: everyone's, the stash, or a character's id. */
  protected readonly filter = signal<string | undefined>(ALL_HOLDERS);

  /** The key items the filter keeps. */
  protected visible(keyItems: readonly KeyItemView[]): readonly KeyItemView[] {
    return filterKeyItems(keyItems, this.filter() ?? ALL_HOLDERS);
  }
}
