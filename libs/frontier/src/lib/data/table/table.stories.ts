import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Temporal } from '@pioneer/shared/kernel';
import { expect, userEvent, within } from 'storybook/test';

import { BadgeTone } from '../../text/badge/badge.component';
import { FRONTIER_PROPERTY_KINDS } from '../property/property-kinds';
import { PropertyKindId } from '../property/property.types';
import type { PropertyContext, PropertyDescriptor } from '../property/property.types';
import { tableFromProperties } from '../property/table-from-properties';
import { ColumnChooser } from './column-chooser/column-chooser.component';
import { TableHeaderCell } from './header-cell/header-cell.component';
import { tableColumns } from './table-features';
import type { TableColumn } from './table-features';
import { tableSchema } from './table-schema';
import { Table } from './table.component';

interface PartyMember {
  readonly id: string;
  readonly name: string;
  readonly ancestry: string;
  readonly className: string;
  readonly level: number;
}

type TableStory = StoryObj<Table<PartyMember>>;

/** The sample headers' message keys, spelled out in full so the key check sees them. */
const SampleMessage = {
  Name: 'frontier.table.sample.name',
  Ancestry: 'frontier.table.sample.ancestry',
  Class: 'frontier.table.sample.class',
  Level: 'frontier.table.sample.level',
  Rarity: 'frontier.table.sample.rarity',
  Added: 'frontier.table.sample.added',
} as const;

const PARTY: ReadonlyArray<PartyMember> = [
  { id: 'valeros', name: 'Valeros', ancestry: 'Human', className: 'Fighter', level: 3 },
  { id: 'seoni', name: 'Seoni', ancestry: 'Human', className: 'Sorcerer', level: 3 },
  { id: 'kyra', name: 'Kyra', ancestry: 'Human', className: 'Cleric', level: 2 },
  { id: 'merisiel', name: 'Merisiel', ancestry: 'Elf', className: 'Rogue', level: 4 },
  { id: 'harsk', name: 'Harsk', ancestry: 'Dwarf', className: 'Ranger', level: 1 },
  { id: 'lini', name: 'Lini', ancestry: 'Gnome', className: 'Druid', level: 2 },
];

const column = tableColumns<PartyMember>();

const COLUMNS: ReadonlyArray<TableColumn<PartyMember>> = column.columns([
  column.accessor('name', { header: SampleMessage.Name }),
  column.accessor('ancestry', { header: SampleMessage.Ancestry }),
  column.accessor('className', { header: SampleMessage.Class }),
  column.accessor('level', { header: SampleMessage.Level }),
]);

/** A semantic table on TanStack Table. Press a column header to sort by it. */
const meta: Meta<Table<PartyMember>> = {
  title: 'Data/Table',
  component: Table,
  subcomponents: { ColumnChooser, TableHeaderCell },
  argTypes: { data: { control: false }, columns: { control: false }, rowId: { control: false } },
  args: {
    data: PARTY,
    columns: COLUMNS,
    caption: 'Party',
    hideCaption: false,
    rowId: (member: PartyMember): string => member.id,
  },
  render: (args) => ({
    props: args,
    template: `<fr-table ${argsToTemplate(args)} />`,
  }),
};

export default meta;

export const Default: TableStory = {};

/** The caption still names the table for screen readers. */
export const HiddenCaption: TableStory = { args: { hideCaption: true } };

/** No rows: an empty state fills the body, under the header. */
export const Empty: TableStory = { args: { data: [] } };

/** A filter caused the empty table: *Clear filters* emits `cleared`. */
export const FilteredEmpty: TableStory = {
  args: { data: [], filtered: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Nothing matches.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Clear filters' })).toBeEnabled();
  },
};

/** The first rows are loading: one skeleton cell per visible column, no spinner. */
export const Loading: TableStory = {
  args: { data: [], loading: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('tbody td fr-skeleton')).toHaveLength(20);
    await expect(canvasElement.querySelector('table')).toHaveAttribute('aria-busy', 'true');
  },
};

/** The rows could not load: an inline error and *Retry*, which emits `retry`. */
export const Failed: TableStory = {
  args: { data: [], failed: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('Could not load this.');
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeEnabled();
  },
};

interface Trait {
  readonly id: string;
  readonly name: string;
  readonly rarity: 'common' | 'uncommon' | 'rare';
  readonly added: Temporal.PlainDate;
}

const TRAITS: ReadonlyArray<Trait> = [
  { id: 'fire', name: 'Fire', rarity: 'common', added: Temporal.PlainDate.from('2026-01-15') },
  { id: 'arcane', name: 'Arcane', rarity: 'uncommon', added: Temporal.PlainDate.from('2026-02-03') },
  { id: 'cursed', name: 'Cursed', rarity: 'rare', added: Temporal.PlainDate.from('2026-03-21') },
];

const RARITY_TONE = { common: BadgeTone.Neutral, uncommon: BadgeTone.Warning, rare: BadgeTone.Info } as const;

const MIXED_COLUMNS = tableSchema<Trait>()
  .addText({ id: 'name', header: SampleMessage.Name, value: (trait) => trait.name })
  .addTag({
    id: 'rarity',
    header: SampleMessage.Rarity,
    value: (trait) => ({ label: trait.rarity, tone: RARITY_TONE[trait.rarity] }),
  })
  .addDate({ id: 'added', header: SampleMessage.Added, value: (trait) => trait.added })
  .build();

/**
 * Columns come from `tableSchema<Row>()`: chain `addText`, `addTag`, `addDate` or `addComponent`, then `build()`.
 * A component cell sorts by its own sort value, apart from what it renders.
 */
export const BuiltFromSchema: StoryObj<Table<Trait>> = {
  args: { data: TRAITS, columns: MIXED_COLUMNS, caption: 'Traits', rowId: (trait: Trait): string => trait.id },
};

const PARTY_PROPERTIES: ReadonlyArray<PropertyDescriptor<PartyMember>> = [
  { id: 'name', label: SampleMessage.Name, kind: PropertyKindId.Text, value: (member) => member.name },
  { id: 'ancestry', label: SampleMessage.Ancestry, kind: PropertyKindId.Text, value: (member) => member.ancestry },
  { id: 'class', label: SampleMessage.Class, kind: PropertyKindId.Text, value: (member) => member.className },
  { id: 'level', label: SampleMessage.Level, kind: PropertyKindId.Number, value: (member) => member.level },
];

/** Plain functions, so the story builds its columns once at module load; an app passes `injectPropertyContext()`. */
const STORY_CONTEXT: PropertyContext = {
  compareText: (left, right) => left.localeCompare(right),
  formatNumber: (value) => value.toLocaleString(),
  formatDate: (value) => value.toLocaleString(),
  translate: (key) => key,
};

const FROM_PROPERTIES = tableFromProperties(PARTY_PROPERTIES, ['name', 'level', 'class'], {
  kinds: new Map(FRONTIER_PROPERTY_KINDS.map((kind) => [kind.id, kind])),
  context: STORY_CONTEXT,
}).build();

/**
 * Columns come from a property list and the ids to show: `tableFromProperties(properties, ['name', 'level'], …)`.
 * Header, width and sorting come from each property, and a number sorts by size, as its kind says.
 */
export const BuiltFromProperties: TableStory = {
  args: { data: PARTY, columns: FROM_PROPERTIES, caption: 'Party', rowId: (member: PartyMember): string => member.id },
};

const HIDEABLE_COLUMNS: ReadonlyArray<TableColumn<PartyMember>> = column.columns([
  column.accessor('name', { header: SampleMessage.Name }),
  column.accessor('ancestry', { header: SampleMessage.Ancestry, meta: { hideable: true } }),
  column.accessor('className', { header: SampleMessage.Class, meta: { hideable: true } }),
  column.accessor('level', { header: SampleMessage.Level, meta: { defaultHidden: true } }),
]);

/** Open *Columns* to show or hide columns. Name stays; Level starts hidden; Reset returns to that. */
export const ColumnVisibility: TableStory = { args: { columns: HIDEABLE_COLUMNS } };

/** The remembered choice comes in through `columnVisibility`, as ids of the hidden columns. */
export const HiddenFromTheStart: TableStory = {
  args: { columns: HIDEABLE_COLUMNS, columnVisibility: ['ancestry', 'level'] },
};

/** The sort comes in through `sorting` and goes out through `sortingChange`, so a page can keep it in its URL. */
export const SortedFromTheStart: TableStory = {
  args: {
    sorting: [
      { column: 'level', descending: true },
      { column: 'name', descending: false },
    ],
  },
};

/** `showDensity` adds the *Row density* switch; compact tightens the rows, and the page keeps the choice. */
export const Density: TableStory = {
  args: { showDensity: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const compact = canvas.getByRole('button', { name: 'Compact' });
    await userEvent.click(compact);
    await expect(compact).toHaveAttribute('aria-pressed', 'true');
    await expect(canvasElement.querySelector('td')).toHaveClass('py-3xs');
  },
};

const SERVER_PAGE: ReadonlyArray<PartyMember> = [
  ...PARTY,
  { id: 'amiri', name: 'Amiri', ancestry: 'Human', className: 'Barbarian', level: 2 },
  { id: 'ezren', name: 'Ezren', ancestry: 'Human', className: 'Wizard', level: 3 },
];

/**
 * A server's list: `manualSorting` leaves the order of `data` alone and only reports the sort, `hasMore` shows
 * *Load more*, which emits `loadMore`, and `loadingMore` makes it busy until the next rows arrive.
 */
export const ServerList: TableStory = {
  args: { data: SERVER_PAGE, manualSorting: true, hasMore: true, loadingMore: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Name' }));
    await expect(canvasElement.querySelector('td')).toHaveTextContent('Valeros');
    await expect(canvas.getByRole('button', { name: 'Load more' })).toBeEnabled();
  },
};

/** The next rows are loading: *Load more* is busy and presses are ignored. */
export const LoadingMore: TableStory = { args: { data: SERVER_PAGE, hasMore: true, loadingMore: true } };

/** Hold Shift while pressing headers to sort by several columns; each shows its place in the sort. */
export const MultiSort: TableStory = {
  args: {
    sorting: [
      { column: 'ancestry', descending: false },
      { column: 'level', descending: true },
    ],
  },
};

/** `stickyHeader` keeps the header row in view while the rows scroll; `stickyFirstColumn` pins the first column. */
export const Sticky: TableStory = {
  args: { data: [...SERVER_PAGE, ...SERVER_PAGE, ...SERVER_PAGE], stickyHeader: true, stickyFirstColumn: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('th')).toHaveClass('sticky');
  },
};
