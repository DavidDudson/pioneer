import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { ActionKind } from '../picker-cell-messages';
import { ActionCostCell } from './action-cost-cell.component';

type ActionCostStory = StoryObj<ActionCostCell>;

const meta: Meta<ActionCostCell> = {
  title: 'Rules/Picker cells/Action cost',
  component: ActionCostCell,
  argTypes: { cost: { control: 'select', options: Object.values(ActionKind) } },
};
export default meta;

/** One action. */
export const OneAction: ActionCostStory = { args: { cost: ActionKind.One } };

/** A reaction. */
export const Reaction: ActionCostStory = { args: { cost: ActionKind.Reaction } };

/** A cost that varies. */
export const Variable: ActionCostStory = { args: { cost: ActionKind.Variable } };

/** No cost: a passive ability. */
export const Passive: ActionCostStory = { args: { cost: ActionKind.Passive } };
