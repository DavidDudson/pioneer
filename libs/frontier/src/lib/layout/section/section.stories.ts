import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { signal } from '@angular/core';
import { expect, within } from 'storybook/test';

import { AsyncData } from '../../async/async-region/async-data.directive';
import type { AsyncQuery } from '../../async/async-region/async-query';
import { Text } from '../../text/text/text.component';
import { SectionBody } from './section-body.directive';
import { Section } from './section.component';

type SectionStory = StoryObj<Section>;

/** A sheet section: a region landmark named by its level 2 heading, which an `fr-link` with `skipTo` can focus. */
const meta: Meta<Section> = {
  title: 'Layout/Section',
  component: Section,
  decorators: [moduleMetadata({ imports: [Text] })],
  parameters: { layout: 'padded' },
  args: { anchor: 'story-identity', heading: 'Identity' },
  render: (args) => ({
    props: args,
    template: `<fr-section [anchor]="anchor" [heading]="heading">
      <fr-text element="p">Valeros, human fighter, level 3.</fr-text>
    </fr-section>`,
  }),
};

export default meta;

export const Default: SectionStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: 'Identity' })).toBeVisible();
    await expect(canvas.getByRole('heading', { level: 2, name: 'Identity' })).toHaveAttribute('tabindex', '-1');
  },
};

/** Only the shown section builds its content: the template of a concealed one is built the first time it is shown. */
export const Lazy: SectionStory = {
  decorators: [moduleMetadata({ imports: [SectionBody] })],
  render: () => ({
    template: `<fr-section anchor="story-lazy" heading="Shown" [concealed]="false">
      <ng-template frSectionBody><fr-text element="p">Built.</fr-text></ng-template>
    </fr-section>
    <fr-section anchor="story-lazy-concealed" heading="Concealed" concealed>
      <ng-template frSectionBody><fr-text element="p">Never built.</fr-text></ng-template>
    </fr-section>`,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Built.')).toBeVisible();
    await expect(canvas.queryByText('Never built.')).toBeNull();
  },
};

/** A frozen stand-in for an `injectQuery(...)` result. */
function query(state: {
  readonly data?: ReadonlyArray<string>;
  readonly error?: Error;
  readonly pending?: boolean;
}): AsyncQuery<ReadonlyArray<string>> {
  return {
    data: signal(state.data),
    error: signal(state.error),
    isPending: (): boolean => state.pending ?? false,
    isError: (): boolean => state.error !== undefined,
  };
}

const ASYNC_SECTION = `<fr-section anchor="story-async" heading="Party" [filtered]="filtered" (cleared)="filtered = false">
  <ng-template let-party [frAsyncData]="query">
    @for (member of party; track member) {
      <fr-text element="p">{{ member }}</fr-text>
    }
  </ng-template>
</fr-section>`;

const asyncDecorators = [moduleMetadata({ imports: [AsyncData] })];

/** With a `frAsyncData` template the section loads its own data: skeleton lines while pending. */
export const AsyncPending: SectionStory = {
  decorators: asyncDecorators,
  render: () => ({ props: { query: query({ pending: true }), filtered: false }, template: ASYNC_SECTION }),
};

export const AsyncLoaded: SectionStory = {
  decorators: asyncDecorators,
  render: () => ({
    props: { query: query({ data: ['Valeros', 'Seoni'] }), filtered: false },
    template: ASYNC_SECTION,
  }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Valeros')).toBeVisible();
  },
};

export const AsyncFailed: SectionStory = {
  decorators: asyncDecorators,
  render: () => ({
    props: { query: query({ error: new Error('Network') }), filtered: false },
    template: ASYNC_SECTION,
  }),
};

export const AsyncEmpty: SectionStory = {
  decorators: asyncDecorators,
  render: () => ({ props: { query: query({ data: [] }), filtered: false }, template: ASYNC_SECTION }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Nothing here yet.')).toBeVisible();
  },
};

/** Nothing matches the filter, with a Clear action. */
export const AsyncFilteredEmpty: SectionStory = {
  decorators: asyncDecorators,
  render: () => ({ props: { query: query({ data: [] }), filtered: true }, template: ASYNC_SECTION }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Clear filters' })).toBeVisible();
  },
};
