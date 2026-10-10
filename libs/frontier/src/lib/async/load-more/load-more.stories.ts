import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { computed, signal } from '@angular/core';
import type { Signal } from '@angular/core';

import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Stack } from '../../layout/stack/stack.component';
import { Surface } from '../../layout/surface/surface.component';
import { ListItem } from '../../list/list-item/list-item.component';
import { List } from '../../list/list/list.component';
import { succeedSlowly } from '../../testing/story-actions';
import { Text } from '../../text/text/text.component';
import { AsyncPending } from '../async-region/async-pending.directive';
import { LoadMoreItem } from './load-more-item.directive';
import type { LoadMoreQuery, PageFetch } from './load-more-query';
import { LoadMore } from './load-more.component';

type LoadMoreStory = StoryObj<LoadMore>;

const PAGE_SIZE = 5;

/** A stand-in for an `injectInfiniteQuery(...)` result over numbered spells, each page after a pause. */
class SpellQuery implements LoadMoreQuery {
  public readonly isFetchingNextPage = signal(false);
  readonly #loaded = signal(1);
  public readonly hasNextPage: Signal<boolean> = computed(() => this.#loaded() < this.#pages);
  public readonly spells: Signal<readonly string[]> = computed(() =>
    Array.from({ length: this.#loaded() * PAGE_SIZE }, (_slot, index) => `Spell ${index + 1}`),
  );

  readonly #pages: number;
  readonly #failing: boolean;

  public constructor(pages: number, failing = false) {
    this.#pages = pages;
    this.#failing = failing;
  }

  public readonly fetchNextPage = async (): Promise<PageFetch> => {
    this.isFetchingNextPage.set(true);
    await succeedSlowly();
    this.isFetchingNextPage.set(false);
    if (this.#failing) {
      return { isError: true, error: new Error('Story failure') };
    }
    this.#loaded.update((loaded) => loaded + 1);
    return { isError: false, error: undefined };
  };
}

const LIST = `
  <fr-surface>
    <fr-load-more [query]="query">
      <ng-template frAsyncPending>
        <fr-stack gap="xs">
          <fr-skeleton width="md" />
          <fr-skeleton width="sm" />
          <fr-skeleton width="md" />
        </fr-stack>
      </ng-template>
      <fr-list markers gap="xs">
        @for (spell of query.spells(); track spell) {
          <fr-list-item frLoadMoreItem><fr-text>{{ spell }}</fr-text></fr-list-item>
        }
      </fr-list>
    </fr-load-more>
  </fr-surface>
`;

/**
 * A long list that loads its next page in place: skeleton rows after the list while it loads, then focus moves to
 * the first new item. A failed page shows inline under the button and keeps the list.
 */
const meta: Meta<LoadMore> = {
  title: 'Async/Load More',
  component: LoadMore,
  decorators: [
    moduleMetadata({ imports: [AsyncPending, List, ListItem, LoadMoreItem, Skeleton, Stack, Surface, Text] }),
  ],
  render: () => ({ props: { query: new SpellQuery(3) }, template: LIST }),
};
export default meta;

/** Three pages; the button goes once the last one lands. */
export const LoadsPages: LoadMoreStory = {};

export const LastPage: LoadMoreStory = {
  render: () => ({ props: { query: new SpellQuery(1) }, template: LIST }),
};

export const FailsToLoad: LoadMoreStory = {
  render: () => ({ props: { query: new SpellQuery(3, true) }, template: LIST }),
};
