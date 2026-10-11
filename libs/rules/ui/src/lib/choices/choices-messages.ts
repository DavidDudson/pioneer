import type { ChoiceState } from './choice-line';

/** Message keys the choices list renders with, spelled out so the key check sees them. */
export const ChoicesMessage = {
  None: 'rules.choices.none',
} as const;

/** What each state's badge says. A planned or invalid one at a level above the character's names it. */
export const CHOICE_STATE_MESSAGES: Readonly<Record<ChoiceState, string>> = {
  open: 'rules.choices.state.open',
  filled: 'rules.choices.state.filled',
  planned: 'rules.choices.state.planned',
  hidden: 'rules.choices.state.hidden',
  invalid: 'rules.choices.state.invalid',
};

/** The badge of an invalid choice planned above the character's level: "Invalid at level 5". */
export const INVALID_AT_MESSAGE = 'rules.choices.state.invalidAt';
