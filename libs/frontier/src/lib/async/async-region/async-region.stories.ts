import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { signal } from '@angular/core';

import { Message } from '../../feedback/message/message.component';
import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Stack } from '../../layout/stack/stack.component';
import { Surface } from '../../layout/surface/surface.component';
import { ListItem } from '../../list/list-item/list-item.component';
import { List } from '../../list/list/list.component';
import { Text } from '../../text/text/text.component';
import { AsyncData } from './async-data.directive';
import { AsyncError } from './async-error.directive';
import { AsyncPending } from './async-pending.directive';
import type { AsyncQuery } from './async-query';
import { AsyncRegion } from './async-region.component';

type Party = readonly string[];

type AsyncRegionStory = StoryObj<AsyncRegion<Party>>;

const PARTY: Party = ['Valeros', 'Seoni', 'Kyra', 'Merisiel'];

/** A stand-in for an `injectQuery(...)` result, frozen in one state. */
function query(state: {
  readonly data?: Party;
  readonly error?: unknown;
  readonly pending?: boolean;
}): AsyncQuery<Party> {
  return {
    data: signal(state.data),
    error: signal(state.error),
    isPending: (): boolean => state.pending ?? false,
    isError: (): boolean => state.error !== undefined,
  };
}

const REGION = `
  <fr-surface>
    <fr-async-region [errorMessage]="errorMessage">
      <ng-template frAsyncPending>
        <fr-stack gap="xs">
          <fr-skeleton width="md" />
          <fr-skeleton width="sm" />
          <fr-skeleton width="md" />
        </fr-stack>
      </ng-template>
      <ng-template let-party [frAsyncData]="query">
        <fr-list markers>
          @for (member of party; track member) {
            <fr-list-item><fr-text>{{ member }}</fr-text></fr-list-item>
          }
        </fr-list>
      </ng-template>
    </fr-async-region>
  </fr-surface>
`;

/**
 * A region over a TanStack query: a skeleton shaped like the content while
 * pending, the content when it arrives, an inline message if it fails.
 */
const meta: Meta<AsyncRegion<Party>> = {
  title: 'Async/Async Region',
  component: AsyncRegion,
  decorators: [
    moduleMetadata({
      imports: [AsyncData, AsyncError, AsyncPending, List, ListItem, Message, Skeleton, Stack, Surface, Text],
    }),
  ],
  render: (args) => ({
    props: { ...args, query: query({ data: PARTY }) },
    template: REGION,
  }),
};
export default meta;

export const Loaded: AsyncRegionStory = {};

export const Pending: AsyncRegionStory = {
  render: () => ({ props: { query: query({ pending: true }) }, template: REGION }),
};

export const Failed: AsyncRegionStory = {
  render: () => ({ props: { query: query({ error: new Error('Network') }) }, template: REGION }),
};

export const FailedWithMessage: AsyncRegionStory = {
  render: () => ({
    props: { query: query({ error: new Error('Network') }), errorMessage: 'Could not load the party.' },
    template: REGION,
  }),
};

/** `frAsyncError` replaces the default failure message. */
export const CustomErrorSlot: AsyncRegionStory = {
  render: () => ({
    props: { query: query({ error: new Error('Network') }) },
    template: `
      <fr-async-region>
        <ng-template frAsyncPending><fr-skeleton /></ng-template>
        <ng-template frAsyncError><fr-message tone="warning">The party is resting. Check back soon.</fr-message></ng-template>
        <ng-template let-party [frAsyncData]="query">{{ party.length }}</ng-template>
      </fr-async-region>
    `,
  }),
};
