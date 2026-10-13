import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Bulk, BulkWeight } from '@pioneer/rules/sdk';

import { BulkCell } from './bulk-cell.component';

type BulkStory = StoryObj<BulkCell>;

const meta: Meta<BulkCell> = { title: 'Rules/Picker cells/Bulk', component: BulkCell };
export default meta;

/** Two Bulk. */
export const Counted: BulkStory = { args: { bulk: Bulk.parse(2) } };

/** Light: "L". */
export const Light: BulkStory = { args: { bulk: BulkWeight.Light } };

/** Negligible: a dash. */
export const Negligible: BulkStory = { args: { bulk: BulkWeight.Negligible } };

/** A kit has no Bulk of its own. */
export const Unknown: BulkStory = { args: { bulk: undefined } };
