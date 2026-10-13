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
import { PackVisibility } from '@pioneer/rules/sdk';

import { HomebrewStore } from '../../data/homebrew-store';

/** How each visibility reads, as full message keys. */
const VISIBILITY_MESSAGES = {
  [PackVisibility.Private]: 'homebrew.pack.visibilityPrivate',
  [PackVisibility.Campaign]: 'homebrew.pack.visibilityCampaign',
  [PackVisibility.Public]: 'homebrew.pack.visibilityPublic',
} as const;

/** One pack's home: its slug, author, visibility and how many entries it holds. */
@Component({
  selector: 'pio-pack-home-page',
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
  templateUrl: './pack-home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackHomePage {
  /** Route param, bound by `withComponentInputBinding`; the store validates it. */
  public readonly id = input.required<string>();

  protected readonly store = inject(HomebrewStore);
  protected readonly title = computed(() => this.store.selected.data()?.title);
  protected readonly visibilityMessages = VISIBILITY_MESSAGES;

  public constructor() {
    effect(() => {
      this.store.select(this.id());
    });
  }
}
