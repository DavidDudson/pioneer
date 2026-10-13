import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { EntryPreviewView } from './entry-preview.component';
import { FIREBALL_PREVIEW } from './entry-preview.fixtures';

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
