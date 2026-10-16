import { RuleElementKey } from '@pioneer/rules/sdk';

import { ORACLE, ORACLE_ENTRY } from './focus-plan';
import type { Grant, Planned } from './focus-plan';

/** An oracle's mystery by its feature's slug, its name, and its initial, advanced and greater revelation spells. */
export const MYSTERIES: readonly (readonly [string, string, string, string, string])[] = [
  ['ancestors', 'Ancestors', 'ancestral-touch', 'ancestral-defense', 'ancestral-form'],
  ['battle', 'Battle', 'weapon-trance', 'battlefield-persistence', 'revel-in-retribution'],
  ['bones', 'Bones', 'soul-siphon', 'armor-of-bones', 'claim-undead'],
  ['cosmos', 'Cosmos', 'spray-of-stars', 'interstellar-void', 'moonlight-bridge'],
  ['flames', 'Flames', 'incendiary-aura', 'whirling-flames', 'flaming-fusillade'],
  ['life', 'Life', 'life-link', 'delay-affliction', 'life-giving-form'],
  ['lore', 'Lore', 'brain-drain', 'access-lore', 'dread-secret'],
  ['tempest', 'Tempest', 'tempest-touch', 'thunderburst', 'tempest-form'],
];

const ORACLE_DEDICATION = 'feat:oracle-dedication';

/**
 * An oracle's mystery: the oracle's focus entry and its initial revelation spell, then its advanced and greater ones
 * once the oracle takes Advanced and Greater Revelation.
 */
export function mystery(initial: string, advanced: string, greater: string): Planned {
  return [
    ORACLE_ENTRY,
    { entry: ORACLE, spells: [initial] },
    { entry: ORACLE, spells: [advanced], predicate: ['feat:advanced-revelation'] },
    { entry: ORACLE, spells: [greater], predicate: ['feat:greater-revelation'] },
  ];
}

/**
 * Oracle Dedication: the mystery the archetype picks, which grants no revelation spell of its own. The pick sets
 * `feat:oracle-dedication:<mystery>`, which First Revelation reads.
 */
export const ORACLE_DEDICATION_RULES: Planned = [
  {
    key: RuleElementKey.ChoiceSet,
    flag: 'mystery',
    rollOption: ORACLE_DEDICATION,
    prompt: 'Select a mystery.',
    choices: MYSTERIES.map(([value, label]) => ({ value, label })),
  },
];

/** First Revelation: the initial revelation spell of the mystery Oracle Dedication picked. */
export const FIRST_REVELATION_RULES: Planned = [
  ORACLE_ENTRY,
  ...MYSTERIES.map(([slug, , initial]): Grant => ({
    entry: ORACLE,
    spells: [initial],
    predicate: [`${ORACLE_DEDICATION}:${slug}`],
  })),
];
