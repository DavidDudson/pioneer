import { signal } from '@angular/core';
import { InlineEdit } from '@pioneer/frontier';
import { Attribute, Level, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ChoiceState } from '../choices/choice-line';
import type { ChoiceLine } from '../choices/choice-line';
import { TimelinePickKind } from '../level-timeline/level-timeline-row';
import type { LevelTimelineRow, TimelinePick } from '../level-timeline/level-timeline-row';
import { featRow } from './feat-picker-fixtures';
import { attributeRow, skillRow } from './slot-picker-fixtures';

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
const FIFTH = Level.parse(5);

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
    format: (value) => (value === undefined || value === NOT_CHOSEN ? 'Not chosen' : value),
    save: async (value) => {
      source.set(value ?? NOT_CHOSEN);
      await Promise.resolve();
    },
  });
}

const FEAT_PICK: TimelinePick = {
  kind: TimelinePickKind.Feat,
  key: SlotKey.parse('fighter:6'),
  label: message('rules.choices.slot.choice', { entry: 'Fighter', prompt: 'Fighter feat' }),
  rows: signal([
    featRow({ id: 'lunge', name: 'Lunge', level: 4 }),
    featRow({
      id: 'knockdown',
      name: 'Knockdown',
      level: 6,
      disabledReason: 'Requires 6th level',
    }),
  ]),
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

const skillLine = (key: string, label: string, level: Level): ChoiceLine => ({
  ...NONE,
  key: SlotKey.parse(key),
  label: message(label, { level }),
  state: ChoiceState.Planned,
  level,
});

const SKILL_PICK: TimelinePick = {
  kind: TimelinePickKind.Skill,
  key: SlotKey.parse('skill-increase:5'),
  label: message('rules.choices.slot.skillIncrease', { level: FIFTH }),
  rows: signal([
    skillRow({ id: 'arcana', name: 'Arcana' }),
    skillRow({ id: 'stealth', name: 'Stealth', disabledReason: 'Trained already' }),
  ]),
  field: pickEdit(NOT_CHOSEN),
};

const BOOST_PICK: TimelinePick = {
  kind: TimelinePickKind.Boost,
  key: SlotKey.parse('boost:5:free:1'),
  label: message('rules.attributes.boost.freeNumbered', { level: FIFTH, number: 1 }),
  rows: signal([
    attributeRow({ id: Attribute.Strength, name: 'Strength', modifier: 4, boosted: 5 }),
    attributeRow({ id: Attribute.Dexterity, name: 'Dexterity', modifier: 2, boosted: 3 }),
  ]),
  field: pickEdit(NOT_CHOSEN),
};

/** A 4th-level character whose 5th-level skill increase and free boost, still unpicked, can be planned. */
export const PLANNING_SKILLS_TIMELINE: readonly LevelTimelineRow[] = [
  { level: FOURTH, current: true, lines: [], picks: [] },
  {
    level: FIFTH,
    current: false,
    lines: [
      skillLine('skill-increase:5', 'rules.choices.slot.skillIncrease', FIFTH),
      skillLine('boost:5:free:1', 'rules.attributes.boost.freeNumbered', FIFTH),
    ],
    picks: [SKILL_PICK, BOOST_PICK],
  },
];
