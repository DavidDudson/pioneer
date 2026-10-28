import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { DWARF_SENSES, FORM_SENSES, SENSE_NAMES } from '../testing/senses-fixtures';
import { SensesView } from './senses.component';

type SensesStory = StoryObj<SensesView>;

const meta: Meta<SensesView> = {
  title: 'Rules/Senses',
  component: SensesView,
  args: { entryNames: SENSE_NAMES },
};
export default meta;

/** While the engine's inputs load: a skeleton. */
export const Loading: SensesStory = {
  args: { senses: undefined },
};

/** Most characters: no special senses, and the panel says so. */
export const Empty: SensesStory = {
  args: { senses: [] },
};

/** An ancestry's vision, with where it comes from. */
export const Dwarf: SensesStory = {
  args: { senses: DWARF_SENSES },
};

/** In a battle form: its senses replace the character's, marked from the form, and the character's own is one disclosure away. */
export const InForm: SensesStory = {
  args: { senses: FORM_SENSES, own: DWARF_SENSES },
};

/** Without display names, senses show their ids and origins read "an entry". */
export const WithoutNames: SensesStory = {
  args: { senses: DWARF_SENSES, entryNames: new Map() },
};
