import { describe, expect, test } from 'bun:test';

import { ContentKind, RuleElementKey } from '@pioneer/rules/sdk';

import { FIGHTER } from './testing/build-fixtures';
import { dataIn, rulesIn } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import { CLOISTERED_CLERIC, DOCTRINE } from './testing/subclass-fixtures';

describe('translateKindData: a class names its subclass', () => {
  test('a Player Core class names its subclass by the tag its options carry; a fighter has none', () => {
    const cleric = translate([{ ...FIGHTER, name: 'Cleric' }]);

    expect(dataIn(cleric, 'cleric')).toMatchObject({ subclass: 'cleric-doctrine' });
    expect(dataIn(translate([FIGHTER]), 'fighter')).not.toHaveProperty('subclass');
  });
});

describe('translateRules: subclass choices', () => {
  const subclass = translate([DOCTRINE, CLOISTERED_CLERIC]);

  test("a subclass's ChoiceSet queries class features by tag and grants the pick, its lang-key prompt left off", () => {
    expect(subclass.envelopes.untranslatedRules).toEqual([]);
    expect(rulesIn(subclass, 'doctrine')).toEqual([
      {
        key: RuleElementKey.ChoiceSet,
        flag: 'cleric-doctrine',
        choices: { kind: ContentKind.ClassFeature, filter: ['item:tag:cleric-doctrine'] },
      },
      { key: RuleElementKey.GrantItem, item: { choice: 'cleric-doctrine' } },
    ]);
  });

  test("a class feature keeps Foundry's other tags, which the subclass query reads", () => {
    expect(dataIn(subclass, 'cloistered-cleric')).toEqual({ tags: ['cleric-doctrine'] });
  });

  test('a ChoiceSet filtering on anything but tags is left as Foundry wrote it', () => {
    const rules = [{ key: 'ChoiceSet', flag: 'weapon', choices: { filter: ['item:trait:fighter'] } }];
    const other = translate([{ ...DOCTRINE, system: { ...DOCTRINE.system, rules } }]);

    expect(other.envelopes.untranslatedRules.map(({ key }) => key)).toEqual(['ChoiceSet']);
  });
});
