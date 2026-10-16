import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { BEASTMASTERS_TRANCE } from './testing/archetype-focus-fixtures';
import { rulesIn } from './testing/build-helpers';
import { idOf, translate } from './testing/import-fixtures';

const { FocusSpells, SpellcastingEntry } = RuleElementKey;

describe("translateKindData: Beastmaster's Trance", () => {
  const rules = rulesIn(translate([BEASTMASTERS_TRANCE]), 'beastmasters-trance');

  test('gives the primal charisma focus entry of the beastmaster archetype', () => {
    expect(rules).toContainEqual({
      key: SpellcastingEntry,
      slug: 'beastmaster-focus',
      tradition: 'primal',
      attribute: 'cha',
      preparation: 'focus',
    });
  });

  test('teaches the focus spell Beastmaster Trance', () => {
    expect(rules).toContainEqual({
      key: FocusSpells,
      entry: 'beastmaster-focus',
      spells: [idOf('spell:beastmaster-trance')],
    });
  });
});
