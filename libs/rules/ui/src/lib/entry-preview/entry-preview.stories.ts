import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { EffectStatusKind, spellAtRank } from '@pioneer/rules/engine';
import { SpellRank } from '@pioneer/rules/sdk';

import { FIREBALL as FIREBALL_DATA } from '../testing/spell-fixtures';
import { EntryPreviewView } from './entry-preview.component';
import {
  CLUMSY_PREVIEW,
  FIREBALL,
  FIREBALL_PREVIEW,
  modifierPreviewEffect,
  notSummarisedPreviewEffect,
} from './entry-preview.fixtures';

type EntryPreviewStory = StoryObj<EntryPreviewView>;

const meta: Meta<EntryPreviewView> = {
  title: 'Rules/Entry preview',
  component: EntryPreviewView,
  args: { preview: FIREBALL_PREVIEW },
};
export default meta;

/** The card a reference or row opens: name, level, traits, the opening of the description and its source. */
export const Spell: EntryPreviewStory = {};

/** An entry with no level or traits shows its name, summary and source alone. */
export const Bare: EntryPreviewStory = {
  args: { preview: { ...FIREBALL_PREVIEW, level: undefined, traits: [] } },
};

/** A condition the character has: its value beside the name, and what it changes with that value applied. */
export const ConditionWithValue: EntryPreviewStory = {
  args: { preview: CLUMSY_PREVIEW },
};

/** What an entry would do to the character: a bonus, a line that counts only sometimes, and an element not summarised. */
export const WouldDo: EntryPreviewStory = {
  args: {
    preview: {
      ...FIREBALL_PREVIEW,
      effects: [
        modifierPreviewEffect(FIREBALL, { statistic: 'Perception', selector: 'perception', value: 1 }),
        modifierPreviewEffect(FIREBALL, {
          statistic: 'Armor Class',
          selector: 'ac',
          value: 2,
          status: { kind: EffectStatusKind.Conditional, summary: undefined },
        }),
        notSummarisedPreviewEffect(FIREBALL),
      ],
    },
  },
};

/** A spell with ranks: pick the rank to cast it at and the card shows its damage and area there, and its effects. */
export const SpellRanks: EntryPreviewStory = {
  args: {
    preview: {
      ...FIREBALL_PREVIEW,
      ranks: {
        from: SpellRank.parse(3),
        cast: (rank) => spellAtRank(FIREBALL_DATA, rank),
        effects: (rank) => [
          modifierPreviewEffect(FIREBALL, { statistic: 'Perception', selector: 'perception', value: rank }),
        ],
      },
    },
  },
};
