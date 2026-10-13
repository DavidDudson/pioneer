import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { RankBadge } from './rank-badge.component';

type RankStory = StoryObj<RankBadge>;

const meta: Meta<RankBadge> = { title: 'Rules/Picker cells/Rank badge', component: RankBadge, args: { rank: 1 } };
export default meta;

/** A first-rank spell. */
export const FirstRank: RankStory = {};

/** A tenth-rank spell. */
export const TenthRank: RankStory = { args: { rank: 10 } };
