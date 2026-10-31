import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ContentId, FundamentalRune } from '@pioneer/rules/sdk';

import { RuneBadgeKind } from './rune-badge-data';
import { RuneBadge } from './rune-badge.component';

type RuneBadgeStory = StoryObj<RuneBadge>;

/** One rune as a gem: a fundamental rune's glyph by grade, a property rune's pair, or an empty slot. */
const meta: Meta<RuneBadge> = {
  title: 'Rules/Rune badge',
  component: RuneBadge,
  args: { rune: { kind: RuneBadgeKind.Fundamental, rune: FundamentalRune.Striking, grade: 1 } },
  render: (args) => ({ props: args, template: `<pio-rune-badge ${argsToTemplate(args)} />` }),
};
export default meta;

export const Striking: RuneBadgeStory = {};
export const GreaterStriking: RuneBadgeStory = {
  args: { rune: { kind: RuneBadgeKind.Fundamental, rune: FundamentalRune.Striking, grade: 2 } },
};
export const MajorPotency: RuneBadgeStory = {
  args: { rune: { kind: RuneBadgeKind.Fundamental, rune: FundamentalRune.Potency, grade: 3 } },
};
export const MythicResilient: RuneBadgeStory = {
  args: { rune: { kind: RuneBadgeKind.Fundamental, rune: FundamentalRune.Resilient, grade: 4 } },
};
export const Flaming: RuneBadgeStory = {
  args: {
    rune: {
      kind: RuneBadgeKind.Property,
      id: ContentId.parse('00000000-0000-4000-8000-000000000001'),
      name: 'Flaming',
    },
  },
};
export const EmptySlot: RuneBadgeStory = { args: { rune: { kind: RuneBadgeKind.Hole } } };
