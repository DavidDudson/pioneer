import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { signal } from '@angular/core';
import { expect, within } from 'storybook/test';

import { Surface } from '../../layout/surface/surface.component';
import { ListItem } from '../../list/list-item/list-item.component';
import { Text } from '../../text/text/text.component';
import { AsyncEmpty } from '../async-region/async-empty.directive';
import { AsyncFilteredEmpty } from '../async-region/async-filtered-empty.directive';
import type { AsyncQuery } from '../async-region/async-query';
import { AsyncItem } from './async-item.directive';
import { AsyncList } from './async-list.component';

type Party = ReadonlyArray<string>;

type AsyncListStory = StoryObj<AsyncList<string>>;

const PARTY: Party = ['Valeros', 'Seoni', 'Kyra', 'Merisiel'];

/** A stand-in for an `injectQuery(...)` result, frozen in one state. */
function query(state: {
  readonly data?: Party;
  readonly error?: Error;
  readonly pending?: boolean;
}): AsyncQuery<Party> {
  return {
    data: signal(state.data),
    error: signal(state.error),
    isPending: (): boolean => state.pending ?? false,
    isError: (): boolean => state.error !== undefined,
  };
}

const LIST = `
  <fr-surface>
    <fr-async-list [query]="query" [filtered]="filtered" (cleared)="filtered = false">
      <ng-template let-member frAsyncItem>
        <fr-list-item divided><fr-text>{{ member }}</fr-text></fr-list-item>
      </ng-template>
    </fr-async-list>
  </fr-surface>
`;

/**
 * A list over a TanStack query: skeleton rows shaped like an item while pending, the rows when they arrive, an
 * inline message if it fails, and empty and filtered-empty states (the filtered one with a Clear button) when
 * there is nothing to show.
 */
const meta: Meta<AsyncList<string>> = {
  title: 'Async/Async List',
  component: AsyncList,
  decorators: [moduleMetadata({ imports: [AsyncEmpty, AsyncFilteredEmpty, AsyncItem, ListItem, Surface, Text] })],
  parameters: { layout: 'padded' },
  render: () => ({ props: { query: query({ data: PARTY }), filtered: false }, template: LIST }),
};

export default meta;

export const Loaded: AsyncListStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(PARTY.length);
  },
};

export const Pending: AsyncListStory = {
  render: () => ({ props: { query: query({ pending: true }), filtered: false }, template: LIST }),
};

export const Failed: AsyncListStory = {
  render: () => ({ props: { query: query({ error: new Error('Network') }), filtered: false }, template: LIST }),
};

export const Empty: AsyncListStory = {
  render: () => ({ props: { query: query({ data: [] }), filtered: false }, template: LIST }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Nothing here yet.')).toBeVisible();
  },
};

/** Nothing matches the filter; the Clear button clears it. */
export const FilteredEmpty: AsyncListStory = {
  render: () => ({ props: { query: query({ data: [] }), filtered: true }, template: LIST }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Nothing matches.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  },
};

/** `frAsyncEmpty` and `frAsyncFilteredEmpty` replace the defaults. */
export const CustomEmpty: AsyncListStory = {
  render: () => ({
    props: { query: query({ data: [] }), filtered: false },
    template: `
      <fr-async-list [query]="query">
        <ng-template let-member frAsyncItem><fr-list-item>{{ member }}</fr-list-item></ng-template>
        <ng-template frAsyncEmpty><fr-text>The party is empty. Recruit someone.</fr-text></ng-template>
        <ng-template frAsyncFilteredEmpty><fr-text>No one by that name.</fr-text></ng-template>
      </fr-async-list>
    `,
  }),
};
