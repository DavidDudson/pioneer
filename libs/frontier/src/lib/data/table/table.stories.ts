import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { TableHeaderCell } from './header-cell/header-cell.component';
import { tableColumns } from './table-features';
import type { TableColumn } from './table-features';
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
  subcomponents: { TableHeaderCell },
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
