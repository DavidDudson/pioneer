import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { DIRECT, ENTRY_NAMES, EVERY_HOP, ORIGIN_NAMES, SET_BY_HAND } from '../testing/origin-fixtures';
import { OriginChainView } from './origin-chain.component';
import { NO_ORIGIN_NAMES } from './origin-names';

type OriginChainStory = StoryObj<OriginChainView>;

const meta: Meta<OriginChainView> = {
  title: 'Rules/Origin chain',
  component: OriginChainView,
  args: { entryNames: ENTRY_NAMES, names: ORIGIN_NAMES },
};
export default meta;

/** Content the character has directly: just the entry, then its sources. */
export const Direct: OriginChainStory = {
  args: { origin: DIRECT },
};

/** One of each hop, outermost first. */
export const EveryHop: OriginChainStory = {
  args: { origin: EVERY_HOP },
};

/** A GM's set override: who, how long ago, and why. */
export const SetByHand: OriginChainStory = {
  args: { origin: SET_BY_HAND },
};

/** Nothing named: the slot key, "an item", "a user", "an entry", and no event. */
export const WithoutNames: OriginChainStory = {
  args: { origin: EVERY_HOP, entryNames: new Map(), names: NO_ORIGIN_NAMES },
};
