import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, userEvent, within } from 'storybook/test';

import { FilterChips } from '../../controls/filter-chips/filter-chips.component';
import { SearchInput } from '../../controls/search-input/search-input.component';
import { Text } from '../../text/text/text.component';
import { Surface } from '../surface/surface.component';
import { TableToolbar } from './table-toolbar.component';
import { ToolbarFilters } from './toolbar-filters.directive';
import { ToolbarView } from './toolbar-view.directive';

type TableToolbarStory = StoryObj<TableToolbar>;

const KINDS = [
  { value: 'spell', label: 'Spells' },
  { value: 'feat', label: 'Feats' },
  { value: 'item', label: 'Items' },
] as const;

const meta: Meta<TableToolbar> = {
  title: 'Layout/Table toolbar',
  component: TableToolbar,
  decorators: [moduleMetadata({ imports: [FilterChips, SearchInput, Surface, Text, ToolbarFilters, ToolbarView] })],
  args: { label: 'Search spells' },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: { ...args, kinds: KINDS },
    template: `
      <fr-table-toolbar [label]="label">
        <fr-search-input frToolbarSearch ariaLabel="Search spells" placeholder="Search spells" />
        <fr-filter-chips frToolbarFilters ariaLabel="Kinds" [options]="kinds" [value]="[]" />
        <fr-text frToolbarView>Columns: name, level</fr-text>
        <fr-text frToolbarCount tone="muted">3 results</fr-text>
      </fr-table-toolbar>
      <fr-surface>The table starts here, one gap below the toolbar.</fr-surface>
    `,
  }),
};

export default meta;

/** One row from the `md` container size. */
export const Default: TableToolbarStory = {};

/** Search alone: no Filters or Columns buttons. */
export const SearchOnly: TableToolbarStory = {
  render: (args) => ({
    props: args,
    template: `
      <fr-table-toolbar [label]="label">
        <fr-search-input frToolbarSearch ariaLabel="Search spells" placeholder="Search spells" />
        <fr-text frToolbarCount tone="muted">3 results</fr-text>
      </fr-table-toolbar>
    `,
  }),
};

/** In a narrow column the search sits alone and Filters and Columns open their content in place. */
export const Narrow: TableToolbarStory = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const filters = canvas.getByRole('button', { name: 'Filters' });
    await expect(filters).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(filters);
    await expect(filters).toHaveAttribute('aria-pressed', 'true');
  },
};
