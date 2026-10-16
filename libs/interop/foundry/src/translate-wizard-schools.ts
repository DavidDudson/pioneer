import { RuleElementKey } from '@pioneer/rules/sdk';

import { WIZARD, WIZARD_ENTRY } from './focus-plan';
import type { Grant, Planned } from './focus-plan';

/** A wizard's school by its feature's slug, its name, and its initial and advanced school spells. */
export const SCHOOLS: readonly (readonly [string, string, string, string])[] = [
  ['school-of-ars-grammatica', 'School of Ars Grammatica', 'protective-wards', 'rune-of-observation'],
  ['school-of-battle-magic', 'School of Battle Magic', 'force-bolt', 'energy-absorption'],
  ['school-of-civic-wizardry', 'School of Civic Wizardry', 'earthworks', 'community-restoration'],
  ['school-of-mentalism', 'School of Mentalism', 'charming-push', 'invisibility-cloak'],
  ['school-of-protean-form', 'School of Protean Form', 'scramble-body', 'shifting-form'],
  ['school-of-the-boundary', 'School of the Boundary', 'fortify-summoning', 'spiral-of-horrors'],
  [
    'school-of-unified-magical-theory',
    'School of Unified Magical Theory',
    'hand-of-the-apprentice',
    'interdisciplinary-incantation',
  ],
];

const WIZARD_DEDICATION = 'feat:wizard-dedication';

/**
 * Wizard Dedication: the school the archetype picks, which grants no ability of its own. The pick sets
 * `feat:wizard-dedication:<school>`, which Arcane School Spell reads.
 */
export const WIZARD_DEDICATION_RULES: Planned = [
  {
    key: RuleElementKey.ChoiceSet,
    flag: 'school',
    rollOption: WIZARD_DEDICATION,
    prompt: 'Select a school.',
    choices: SCHOOLS.map(([value, label]) => ({ value, label })),
  },
];

/** Arcane School Spell: the initial school spell of the school Wizard Dedication picked. */
export const ARCANE_SCHOOL_SPELL_RULES: Planned = [
  WIZARD_ENTRY,
  ...SCHOOLS.map(([slug, , initial]): Grant => ({
    entry: WIZARD,
    spells: [initial],
    predicate: [`${WIZARD_DEDICATION}:${slug}`],
  })),
];

/** A wizard's school: its initial school spell, and its advanced one once the wizard takes Advanced School Spell. */
export function school(initial: string, advanced: string): Planned {
  return [
    WIZARD_ENTRY,
    { entry: WIZARD, spells: [initial] },
    {
      entry: WIZARD,
      spells: [advanced],
      predicate: ['feat:advanced-school-spell'],
    },
  ];
}
