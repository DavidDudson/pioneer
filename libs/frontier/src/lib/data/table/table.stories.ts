import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Temporal } from '@pioneer/shared/kernel';

import { BadgeTone } from '../../text/badge/badge.component';
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

const PARTY: readonly PartyMember[] = [
  { id: 'valeros', name: 'Valeros', ancestry: 'Human', className: 'Fighter', level: 3 },
  { id: 'seoni', name: 'Seoni', ancestry: 'Human', className: 'Sorcerer', level: 3 },
  { id: 'kyra', name: 'Kyra', ancestry: 'Human', className: 'Cleric', level: 2 },
  { id: 'merisiel', name: 'Merisiel', ancestry: 'Elf', className: 'Rogue', level: 4 },
  { id: 'harsk', name: 'Harsk', ancestry: 'Dwarf', className: 'Ranger', level: 1 },
  { id: 'lini', name: 'Lini', ancestry: 'Gnome', className: 'Druid', level: 2 },
];

const column = tableColumns<PartyMember>();

const COLUMNS: readonly TableColumn<PartyMember>[] = column.columns([
  column.accessor('name', { header: 'Name' }),
  column.accessor('ancestry', { header: 'Ancestry' }),
  column.accessor('className', { header: 'Class' }),
  column.accessor('level', { header: 'Level' }),
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

export const Empty: TableStory = { args: { data: [] } };

interface Trait {
  readonly id: string;
  readonly name: string;
  readonly rarity: 'common' | 'uncommon' | 'rare';
  readonly added: Temporal.PlainDate;
}

const TRAITS: readonly Trait[] = [
  { id: 'fire', name: 'Fire', rarity: 'common', added: Temporal.PlainDate.from('2026-01-15') },
  { id: 'arcane', name: 'Arcane', rarity: 'uncommon', added: Temporal.PlainDate.from('2026-02-03') },
  { id: 'cursed', name: 'Cursed', rarity: 'rare', added: Temporal.PlainDate.from('2026-03-21') },
];

const RARITY_TONE = { common: BadgeTone.Neutral, uncommon: BadgeTone.Warning, rare: BadgeTone.Info } as const;

const MIXED_COLUMNS = tableSchema<Trait>()
  .addText({ id: 'name', header: 'Name', value: (trait) => trait.name })
  .addTag({
    id: 'rarity',
    header: 'Rarity',
    value: (trait) => ({ label: trait.rarity, tone: RARITY_TONE[trait.rarity] }),
  })
  .addDate({ id: 'added', header: 'Added', value: (trait) => trait.added })
  .build();

/**
 * Columns come from `tableSchema<Row>()`: chain `addText`, `addTag`, `addDate` or `addComponent`, then `build()`.
 * A component cell sorts by its own sort value, apart from what it renders.
 */
export const BuiltFromSchema: StoryObj<Table<Trait>> = {
  args: { data: TRAITS, columns: MIXED_COLUMNS, caption: 'Traits', rowId: (trait: Trait): string => trait.id },
};

const HIDEABLE_COLUMNS: readonly TableColumn<PartyMember>[] = column.columns([
  column.accessor('name', { header: 'Name' }),
  column.accessor('ancestry', { header: 'Ancestry', meta: { hideable: true } }),
  column.accessor('className', { header: 'Class', meta: { hideable: true } }),
  column.accessor('level', { header: 'Level', meta: { defaultHidden: true } }),
]);

/** Open *Columns* to show or hide columns. Name stays; Level starts hidden; Reset returns to that. */
export const ColumnVisibility: TableStory = { args: { columns: HIDEABLE_COLUMNS } };

/** The remembered choice comes in through `columnVisibility`, as ids of the hidden columns. */
export const HiddenFromTheStart: TableStory = {
  args: { columns: HIDEABLE_COLUMNS, columnVisibility: ['ancestry', 'level'] },
};
