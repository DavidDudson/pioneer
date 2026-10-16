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
const SPELL_SLOTS_PREFIX = 'spell-slots:';
const NAMED_KEY = 'character.import.result.statistic.named';
const SPELL_DC_KEY = 'character.import.result.statistic.spellDc';
const SPELL_SLOTS_KEY = 'character.import.result.statistic.spellSlots';

/** What names a statistic row whose selector no statistic definition names: its message key and parameters. */
export interface StatisticLabel {
  readonly key: string;
  readonly params: Readonly<Record<string, string>>;
}

/**
 * What names the row of `selector`: the ranked statistics and spell DCs and spell slots no statistic definition names get their own
 * message; every other row shows its definition's `name`, or its selector when the engine could not derive it.
 */
export function statisticLabel(selector: Selector, name: string | undefined): StatisticLabel {
  const key = RANK_KEYS[selector];
  if (key !== undefined) {
    return { key, params: {} };
  }
  if (selector.startsWith(SPELL_SLOTS_PREFIX)) {
    const [entry = '', rank = ''] = selector.slice(SPELL_SLOTS_PREFIX.length).split(':');
    return { key: SPELL_SLOTS_KEY, params: { entry, rank } };
  }
  return selector.startsWith(SPELL_DC_PREFIX)
    ? { key: SPELL_DC_KEY, params: { entry: selector.slice(SPELL_DC_PREFIX.length) } }
    : { key: NAMED_KEY, params: { name: name ?? selector } };
}
