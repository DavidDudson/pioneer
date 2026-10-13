import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { RichText } from '@pioneer/rules/sdk';

import { SummaryCell } from './summary-cell.component';

type SummaryStory = StoryObj<SummaryCell>;

const LONG = [
  {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: 'You make two Strikes against the same target, then follow with a third at a penalty. If any of them hit, the target is off-guard until the end of your next turn and you may Stride half your Speed.',
      },
    ],
  },
];

const meta: Meta<SummaryCell> = { title: 'Rules/Picker cells/Summary', component: SummaryCell };
export default meta;

/** A long summary is cut off after two lines. */
export const Clamped: SummaryStory = { args: { text: RichText.parse(LONG) } };
