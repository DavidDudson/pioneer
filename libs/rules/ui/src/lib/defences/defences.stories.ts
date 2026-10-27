import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import {
  adjustment,
  ADAMANTINE,
  BARBARIAN_DEFENCES,
  DWARF,
  ENTRY_NAMES,
  FORM_DEFENCES,
  FIRE_RING,
  GOLEM_FORM,
  IN_DARKNESS,
  immunity,
  NO_DEFENCES,
  OUT_OF_RANGE,
  RAGE,
  SLEEP,
  WHILE_RAGING,
} from '../testing/defences-fixtures';
import { DefencesView } from './defences.component';

type DefencesStory = StoryObj<DefencesView>;

const meta: Meta<DefencesView> = {
  title: 'Rules/Defences',
  component: DefencesView,
  args: { entryNames: ENTRY_NAMES },
};
export default meta;

/** While the engine's inputs load: skeletons shaped like the three lists. */
export const Loading: DefencesStory = {
  args: { defences: undefined },
};

/** Most characters: three empty lists, each saying so. */
export const Empty: DefencesStory = {
  args: { defences: NO_DEFENCES },
};

/** One of each list, with a group, an exception, a conditional resistance and a superseded one. */
export const Barbarian: DefencesStory = {
  args: {
    defences: BARBARIAN_DEFENCES,
    immunityNames: new Map([[SLEEP, 'sleep effects']]),
    exceptionNames: new Map([[ADAMANTINE, 'adamantine']]),
  },
};

/** Groups spelled out with the types they cover; `all` reads as all damage. */
export const Groups: DefencesStory = {
  args: {
    defences: {
      ...NO_DEFENCES,
      resistances: [
        adjustment(RAGE, 'physical', { value: 3 }),
        adjustment(FIRE_RING, 'energy', { value: 5 }),
        adjustment(DWARF, 'all', { value: 1 }),
      ],
    },
  },
};

/** Conditional defences say when they hold: an authored summary, and a generated one. */
export const Conditional: DefencesStory = {
  args: {
    defences: {
      immunities: [immunity(RAGE, 'mental', WHILE_RAGING)],
      weaknesses: [],
      resistances: [adjustment(DWARF, 'cold', { value: 2, status: IN_DARKNESS })],
    },
  },
};

/** A value past the bound fails, says why and shows no value. */
export const Failed: DefencesStory = {
  args: {
    defences: { ...NO_DEFENCES, weaknesses: [adjustment(GOLEM_FORM, 'cold', { status: OUT_OF_RANGE })] },
  },
};

/** In a battle form: the lines it gives are marked from the form, and the character's own sits beside them, superseded. */
export const InForm: DefencesStory = {
  args: { defences: FORM_DEFENCES },
};

/** Without display names, origins read "an entry" and slugs show as they are. */
export const WithoutNames: DefencesStory = {
  args: { defences: BARBARIAN_DEFENCES, entryNames: new Map() },
};
