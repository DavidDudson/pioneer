import type { Selector } from '@pioneer/rules/sdk';

/** Label key per ranked statistic no statistic definition names: armor and weapon categories, and casting. */
const RANK_KEYS: Readonly<Record<string, string>> = {
  'defense:unarmored': 'character.import.result.statistic.defenseUnarmored',
  'defense:light': 'character.import.result.statistic.defenseLight',
  'defense:medium': 'character.import.result.statistic.defenseMedium',
  'defense:heavy': 'character.import.result.statistic.defenseHeavy',
  'attack:unarmed': 'character.import.result.statistic.attackUnarmed',
  'attack:simple': 'character.import.result.statistic.attackSimple',
  'attack:martial': 'character.import.result.statistic.attackMartial',
  'attack:advanced': 'character.import.result.statistic.attackAdvanced',
  spellcasting: 'character.import.result.statistic.spellcasting',
};

const SPELL_DC_PREFIX = 'spell-dc:';
const SPELL_DC_KEY = 'character.import.result.statistic.spellDc';

/** What names a statistic row whose selector no statistic definition names: its message key and parameters. */
export interface StatisticLabel {
  readonly key: string;
  readonly params: Readonly<Record<string, string>>;
}

/** The label of `selector` when it is one the engine ranks or derives per entry, undefined for the rest. */
export function statisticLabel(selector: Selector): StatisticLabel | undefined {
  const key = RANK_KEYS[selector];
  if (key !== undefined) {
    return { key, params: {} };
  }
  return selector.startsWith(SPELL_DC_PREFIX)
    ? { key: SPELL_DC_KEY, params: { entry: selector.slice(SPELL_DC_PREFIX.length) } }
    : undefined;
}
