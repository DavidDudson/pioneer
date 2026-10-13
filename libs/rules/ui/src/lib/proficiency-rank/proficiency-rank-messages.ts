import { Proficiency } from '@pioneer/rules/sdk';

/** A rank's name, spelled out so the key check sees it. */
export const PROFICIENCY_NAMES = {
  [Proficiency.Untrained]: 'rules.proficiency.untrained',
  [Proficiency.Trained]: 'rules.proficiency.trained',
  [Proficiency.Expert]: 'rules.proficiency.expert',
  [Proficiency.Master]: 'rules.proficiency.master',
  [Proficiency.Legendary]: 'rules.proficiency.legendary',
} as const satisfies Readonly<Record<Proficiency, string>>;

/** A rank's one-letter abbreviation (U, T, E, M, L), spelled out so the key check sees it. */
export const PROFICIENCY_LETTERS = {
  [Proficiency.Untrained]: 'rules.proficiency.letter.untrained',
  [Proficiency.Trained]: 'rules.proficiency.letter.trained',
  [Proficiency.Expert]: 'rules.proficiency.letter.expert',
  [Proficiency.Master]: 'rules.proficiency.letter.master',
  [Proficiency.Legendary]: 'rules.proficiency.letter.legendary',
} as const satisfies Readonly<Record<Proficiency, string>>;
