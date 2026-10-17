import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Link, Page, PageBody, PageHeader, Stack } from '@pioneer/frontier';

import { CampaignStore } from '../../data/campaign-store';
import { CampaignKeyItemsPanel } from '../campaign-key-items/campaign-key-items.component';

/**
 * The Party Inventory (ADR-0064): every key item of the campaign and who holds it, filtered by holder. Every member
 * reads it; the GM also creates, gives, moves, takes back and archives from it.
 */
@Component({
  selector: 'pio-campaign-inventory-page',
  imports: [CampaignKeyItemsPanel, Link, Page, PageBody, PageHeader, Stack, TranslocoPipe],
  templateUrl: './campaign-inventory-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignInventoryPage {
  /** Route param, bound by `withComponentInputBinding`; the store validates it. */
  public readonly id = input.required<string>();

  protected readonly store = inject(CampaignStore);

  public constructor() {
    effect(() => {
      this.store.select(this.id());
    });
  }
}
