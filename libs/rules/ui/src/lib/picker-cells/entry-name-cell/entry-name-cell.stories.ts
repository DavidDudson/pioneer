import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { EntryNameCell } from './entry-name-cell.component';

type EntryNameStory = StoryObj<EntryNameCell>;

const meta: Meta<EntryNameCell> = {
  title: 'Rules/Picker cells/Entry name',
  component: EntryNameCell,
  args: { name: 'Power Attack', to: ['/content', 'feat', 'power-attack'] },
};
export default meta;

/** An entry's name, linking to its page. */
export const Name: EntryNameStory = {};
