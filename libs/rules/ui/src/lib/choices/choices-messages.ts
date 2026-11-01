import type { ChoiceState } from './choice-line';

/** Message keys the choices list renders with, spelled out so the key check sees them. */
export const ChoicesMessage = {
  None: 'rules.choices.none',
  /** Names the toggle that keeps a pick when the rest are re-rolled: "Keep Ancestry when re-rolling". */
  Keep: 'rules.choices.keep',
  /** The toggle's visible text. */
  KeepShort: 'rules.choices.keepShort',
  /** Marks a pick from a pre-remaster book. */
  Legacy: 'rules.choices.legacy',
  /** Marks a pick from a pack the character no longer has in force. */
  Unsupported: 'rules.choices.unsupported',
  /** The tiny mark on a replaced pick; its accessible name: "Legacy Elf has a newer version". */
  Replaced: 'rules.choices.replaced',
  /** The mark's visible text. */
  ReplacedMark: 'rules.choices.replacedMark',
  /** What the open mark explains: "{name} is legacy content; {replacement} replaces it." */
  ReplacedExplained: 'rules.choices.replacedExplained',
  /** The button that swaps the pick: "Replace with {name}". */
  ReplaceWith: 'rules.choices.replaceWith',
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
