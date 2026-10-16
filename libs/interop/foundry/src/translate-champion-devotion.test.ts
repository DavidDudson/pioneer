import { describe, expect, test } from 'bun:test';

import { PackId, RuleElementKey } from '@pioneer/rules/sdk';

import { focusSpells } from './focus-plan';
import { rulesIn } from './testing/build-helpers';
import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import {
  BLESSED_ONE_DEDICATION,
  BLESSED_SACRIFICE,
  DEVOTION_SPELLS,
  DEVOUT_MAGIC,
} from './testing/spellcasting-fixtures';

const { ChoiceSet, FocusSpells, SpellcastingEntry } = RuleElementKey;

const CHAMPION_ENTRY = {
  key: SpellcastingEntry,
  slug: 'champion-focus',
  tradition: 'divine',
  attribute: 'cha',
  preparation: 'focus',
};
const spell = (slug: string): string => idOf(`spell:${slug}`);

function keyed(key: string, name: string, fixture: DocumentFixture): Record<string, unknown>[] {
  return rulesIn(translate([fixture]), name).filter(
    (rule): rule is Record<string, unknown> =>
      typeof rule === 'object' && rule !== null && 'key' in rule && rule.key === key,
  );
}

describe('translateKindData: champion devotion spells', () => {
  test.each([
    ['devotion-spells', DEVOTION_SPELLS, 'devotion-spell'],
    ['devout-magic', DEVOUT_MAGIC, 'devout-magic'],
  ])('%s picks Shields of the Spirit or the deity font spell, in the divine charisma entry', (name, fixture, flag) => {
    expect(keyed(SpellcastingEntry, name, fixture)).toEqual([CHAMPION_ENTRY]);
    expect(keyed(ChoiceSet, name, fixture)[0]).toMatchObject({
      flag,
      rollOption: flag,
      choices: [
        { value: 'shields-of-the-spirit' },
        { value: 'lay-on-hands', predicate: ['deity:primary:font:heal'] },
        { value: 'touch-of-the-void', predicate: ['deity:primary:font:harm'] },
      ],
    });
    expect(keyed(FocusSpells, name, fixture)).toEqual(
      ['shields-of-the-spirit', 'lay-on-hands', 'touch-of-the-void'].map((pick) => ({
        key: FocusSpells,
        entry: 'champion-focus',
        spells: [spell(pick)],
        predicate: [`${flag}:${pick}`],
      })),
    );
  });

  test('Blessed One Dedication gives Lay on Hands', () => {
    expect(keyed(FocusSpells, 'blessed-one-dedication', BLESSED_ONE_DEDICATION)).toEqual([
      { key: FocusSpells, entry: 'champion-focus', spells: [spell('lay-on-hands')] },
    ]);
  });

  test("Blessed Sacrifice gives Protector's Sacrifice, which Player Core prints", () => {
    expect(keyed(FocusSpells, 'blessed-sacrifice', BLESSED_SACRIFICE)).toEqual([
      { key: FocusSpells, entry: 'champion-focus', spells: [spell('protectors-sacrifice')] },
    ]);
  });

  test("a spell named `<book>/<slug>` is the book's, not the pack being imported's", () => {
    const grant = { entry: 'champion-focus', spells: ['player-core/protectors-sacrifice'] };

    expect(focusSpells(PackId.parse('player-core-2'), grant)).toEqual(
      focusSpells(PackId.parse('player-core'), { ...grant, spells: ['protectors-sacrifice'] }),
    );
  });
});
