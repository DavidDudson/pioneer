import { Level, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { ChoiceState } from '../choices/choice-line';
import type { ChoiceLine } from '../choices/choice-line';
import type { LevelTimelineRow } from '../level-timeline/level-timeline-row';

const NONE = { selection: undefined, level: undefined, reason: undefined };

/** What a fighter feat line adds to an empty one: its pick, and the level a planned one opens at. */
type FeatPick = Partial<Pick<ChoiceLine, 'selection' | 'level'>>;

const featLine = (key: string, state: ChoiceState, pick: FeatPick = {}): ChoiceLine => ({
  ...NONE,
  key: SlotKey.parse(key),
  label: message('rules.choices.slot.choice', { entry: 'Fighter', prompt: 'Fighter feat' }),
  state,
  ...pick,
});

const FIRST = Level.parse(1);
const SECOND = Level.parse(2);
const THIRD = Level.parse(3);
const FOURTH = Level.parse(4);

/** A 2nd-level fighter: a feat picked at 1st, one still open at 2nd (the current level), nothing at 3rd, a plan at 4th. */
export const FIGHTER_TIMELINE: readonly LevelTimelineRow[] = [
  {
    level: FIRST,
    current: false,
    lines: [featLine('fighter:2', ChoiceState.Filled, { selection: { name: 'Power Attack' } })],
  },
  { level: SECOND, current: true, lines: [featLine('fighter:4', ChoiceState.Open)] },
  { level: THIRD, current: false, lines: [] },
  {
    level: FOURTH,
    current: false,
    lines: [featLine('fighter:6', ChoiceState.Planned, { selection: { name: 'Lunge' }, level: FOURTH })],
  },
];
