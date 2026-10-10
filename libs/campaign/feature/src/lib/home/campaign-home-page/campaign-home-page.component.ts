import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  DescriptionItem,
  DescriptionList,
  Heading,
  Page,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';

import { CampaignStore } from '../../data/campaign-store';

/** One campaign's home: when it started and how many are in it. */
@Component({
  selector: 'pio-campaign-home-page',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    DateDisplay,
    DescriptionItem,
    DescriptionList,
    Heading,
    Page,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignHomePage {
  /** Route param, bound by `withComponentInputBinding`; the store validates it. */
  public readonly id = input.required<string>();

  protected readonly store = inject(CampaignStore);
  protected readonly title = computed(() => this.store.selected.data()?.name);

  public constructor() {
    effect(() => {
      this.store.select(this.id());
    });
  }
}
