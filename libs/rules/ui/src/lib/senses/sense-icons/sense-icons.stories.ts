import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { DWARF_SENSES, FORM_SENSES, SENSE_NAMES } from '../../testing/senses-fixtures';
import { SenseIcons } from './sense-icons.component';

type SenseIconsStory = StoryObj<SenseIcons>;

const meta: Meta<SenseIcons> = {
  title: 'Rules/Sense Icons',
  component: SenseIcons,
  args: { entryNames: SENSE_NAMES },
};
export default meta;

/** While the engine's inputs load: a skeleton. */
export const Loading: SenseIconsStory = {
  args: { senses: undefined },
};

/** Most characters: no special senses, and the block says so. */
export const Empty: SenseIconsStory = {
  args: { senses: [] },
};

/** A precise sense from the ancestry. */
export const Dwarf: SenseIconsStory = {
  args: { senses: DWARF_SENSES },
};

/** Senses of different acuity, each with its own icon. */
export const Mixed: SenseIconsStory = {
  args: { senses: [...DWARF_SENSES, ...FORM_SENSES] },
};
