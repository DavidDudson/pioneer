import { signal } from '@angular/core';
import { InlineEdit } from '@pioneer/frontier';
import { Level, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ChoiceState } from '../choices/choice-line';
import type { ChoiceLine } from '../choices/choice-line';
import { TimelinePickKind } from '../level-timeline/level-timeline-row';
import type { LevelTimelineRow, TimelinePick } from '../level-timeline/level-timeline-row';

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
    picks: [],
  },
  { level: SECOND, current: true, lines: [featLine('fighter:4', ChoiceState.Open)], picks: [] },
  { level: THIRD, current: false, lines: [], picks: [] },
  {
    level: FOURTH,
    current: false,
    lines: [featLine('fighter:6', ChoiceState.Planned, { selection: { name: 'Lunge' }, level: FOURTH })],
    picks: [],
  },
];

const spellLine = (key: string, rank: number, pick: Partial<ChoiceLine>): ChoiceLine => ({
  ...NONE,
  key: SlotKey.parse(key),
  label: message('rules.choices.slot.rankSpell', { rank }),
  state: ChoiceState.Open,
  ...pick,
});

/** A 2nd-level bard: a repertoire spell picked at 1st, one not chosen, and a 2nd-rank spell planned for 3rd. */
export const BARD_TIMELINE: readonly LevelTimelineRow[] = [
  {
    level: FIRST,
    current: false,
    lines: [
      spellLine('repertoire:bard:1:0', 1, { state: ChoiceState.Filled, selection: { name: 'Force Barrage' } }),
      spellLine('repertoire:bard:1:1', 1, {}),
    ],
    picks: [],
  },
  { level: SECOND, current: true, lines: [], picks: [] },
  {
    level: THIRD,
    current: false,
    lines: [spellLine('repertoire:bard:2:0', 2, { level: THIRD })],
    picks: [],
  },
];

const NOT_CHOSEN = '';
const PlanPick = z.string();

function pickEdit(initial: string): InlineEdit<string | undefined> {
  const source = signal<string | undefined>(initial);
  return new InlineEdit<string | undefined>({
    source,
    empty: NOT_CHOSEN,
    schema: PlanPick,
    save: async (value) => {
      source.set(value ?? NOT_CHOSEN);
      await Promise.resolve();
    },
  });
}

const FEAT_PICK: TimelinePick = {
  kind: TimelinePickKind.Combobox,
  key: SlotKey.parse('fighter:6'),
  label: message('rules.choices.slot.choice', { entry: 'Fighter', prompt: 'Fighter feat' }),
  matches: signal([
    { value: 'lunge', label: 'Lunge' },
    { value: 'knockdown', label: 'Knockdown', disabled: true, description: 'Requires 6th level' },
  ]),
  search: () => undefined,
  reason: signal(undefined),
  field: pickEdit(NOT_CHOSEN),
};

/** A 2nd-level fighter whose 4th-level feat, still unpicked, can be planned. */
export const PLANNING_TIMELINE: readonly LevelTimelineRow[] = [
  { level: FIRST, current: false, lines: [], picks: [] },
  { level: SECOND, current: true, lines: [], picks: [] },
  {
    level: FOURTH,
    current: false,
    lines: [featLine('fighter:6', ChoiceState.Planned, { level: FOURTH })],
    picks: [FEAT_PICK],
  },
];
