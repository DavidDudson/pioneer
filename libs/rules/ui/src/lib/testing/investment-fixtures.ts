import { LineStatusKind, SuppressionReason } from '@pioneer/rules/engine';
import { ContentId, contentId, EntrySlug, ModifierType, PackId } from '@pioneer/rules/sdk';

import type { Investment } from '../inventory/investments/investment';
import { line, ruleId } from './breakdown-fixtures';

const PLAYER_CORE = PackId.parse('player-core');
const CLOAK = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('equipment:cloak-of-elvenkind')));
const BRACERS = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('equipment:bracers-of-armor')));

/**
 * Four invested items: a cloak that adds to two statistics, bracers whose bonus a better item bonus beats, a ring
 * that turns on nothing the sheet shows, and one invested but taken off.
 */
export const INVESTMENTS: readonly Investment[] = [
  {
    id: 'cloak',
    name: 'Cloak of Elvenkind',
    working: true,
    effects: [
      { statistic: 'Reflex', line: line(CLOAK, { type: ModifierType.Item, value: 1 }) },
      { statistic: 'Perception', line: line(CLOAK, { type: ModifierType.Item, value: 1 }) },
    ],
  },
  {
    id: 'bracers',
    name: 'Bracers of Armor',
    working: true,
    effects: [
      {
        statistic: 'Armor Class',
        line: line(BRACERS, {
          type: ModifierType.Item,
          value: 1,
          status: { kind: LineStatusKind.Suppressed, by: ruleId(CLOAK), reason: SuppressionReason.Stacking },
        }),
      },
    ],
  },
  { id: 'ring', name: 'Ring of the Ram', working: true, effects: [] },
  { id: 'stealth', name: 'Ring of Stealth', working: false, effects: [] },
];

/** The investment limit, for a story at it. */
export const INVESTMENT_LIMIT = 10;

/** For a story at the limit: as many worn rings of nothing much as the limit allows. */
export const TEN_INVESTMENTS: readonly Investment[] = Array.from(
  { length: INVESTMENT_LIMIT },
  (_unused, index): Investment => ({ id: `ring-${index}`, name: `Ring ${index + 1}`, working: true, effects: [] }),
);
