import { describe, expect, test } from 'bun:test';

import { ContentId, RuleElementKey } from '@pioneer/rules/sdk';

import { danglingPick, ownedFlagsOf, withOwnedPicks } from './translate-owned-picks';
import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raws: readonly object[]): RuleTranslation {
  return translateRules(ENTRY, raws, { lang: { PF2E: { Weapon: 'Pick a weapon.' } }, values: { item: 'Spirit Edge' } });
}

const PICK = '{item|flags.system.rulesSelections.edgeWeapon}';

const CHOOSE_WEAPON = {
  key: RuleElementKey.ChoiceSet,
  flag: 'edgeWeapon',
  prompt: 'PF2E.Weapon',
  choices: { ownedItems: true, types: ['weapon'], predicate: ['item:equipped'] },
};

const SPIRIT_DICE = {
  key: RuleElementKey.DamageDice,
  selector: `${PICK}-damage`,
  damageType: 'spirit',
  diceNumber: 1,
  dieSize: 'd6',
};

describe('a ChoiceSet over owned items from Foundry', () => {
  test('is a query of owned kinds, and its readers reach the pick as picked:<flag>', () => {
    const { rules, untranslated } = translated([CHOOSE_WEAPON, SPIRIT_DICE]);

    expect(untranslated).toEqual([]);
    expect(rules[0]).toMatchObject({
      key: RuleElementKey.ChoiceSet,
      flag: 'edge-weapon',
      choices: { ownedKinds: ['weapon'], filter: ['item:equipped'] },
    });
    expect(rules[1]).toMatchObject({ key: RuleElementKey.DamageDice, selectors: ['picked:edge-weapon-damage'] });
  });

  test('stays in the backlog with its readers when one of them cannot be translated', () => {
    const unreadable = {
      key: RuleElementKey.FlatModifier,
      selector: `${PICK}-damage`,
      value: '@weapon.system.damage.dice',
    };
    const { rules, untranslated } = translated([CHOOSE_WEAPON, SPIRIT_DICE, unreadable]);

    expect(rules).toEqual([]);
    expect(untranslated).toHaveLength(3);
  });

  test('is kept for the backlog when nothing reads its pick', () => {
    const { rules, untranslated } = translated([CHOOSE_WEAPON]);

    expect(rules).toEqual([]);
    expect(untranslated).toHaveLength(1);
  });

  test('is kept for the backlog when it asks for a type of item Pioneer has no kind for', () => {
    const { rules } = translated([
      { ...CHOOSE_WEAPON, choices: { ownedItems: true, types: ['spellcastingEntry'] } },
      SPIRIT_DICE,
    ]);

    expect(rules).toEqual([]);
  });
});

describe('an ItemAlteration aimed at an owned pick', () => {
  const alteration = {
    key: RuleElementKey.ItemAlteration,
    itemId: PICK,
    mode: 'add',
    property: 'traits',
    value: 'agile',
  };

  test('alters the items that are the pick', () => {
    const { rules, untranslated } = translated([CHOOSE_WEAPON, alteration]);

    expect(untranslated).toEqual([]);
    expect(rules[1]).toMatchObject({
      key: RuleElementKey.ItemAlteration,
      items: ['item:picked:edge-weapon'],
      value: 'agile',
    });
  });

  test('reads item:id:{pick} in its predicate the same way', () => {
    const { itemId, ...rest } = alteration;
    const { rules } = translated([CHOOSE_WEAPON, { ...rest, predicate: [`item:id:${PICK}`, 'item:trait:thrown'] }]);

    expect(rules[1]).toMatchObject({ items: ['item:picked:edge-weapon', 'item:trait:thrown'] });
    expect(itemId).toBe(PICK);
  });
});

describe('a rule that reaches the weapons by their definition', () => {
  const holy = { key: RuleElementKey.AdjustStrike, mode: 'add', property: 'traits', value: 'holy' };

  test.each(['id', 'slug'])('an AdjustStrike aimed at item:%s:{pick} reaches the pick', (name) => {
    const { rules, untranslated } = translated([CHOOSE_WEAPON, { ...holy, definition: [`item:${name}:${PICK}`] }]);

    expect(untranslated).toEqual([]);
    expect(rules[1]).toMatchObject({ key: RuleElementKey.AdjustStrike, strikes: ['item:picked:edge-weapon'] });
  });

  test('keeps the other statements of the definition, and a pick no ChoiceSet over owned items declares', () => {
    const { rules } = translated([CHOOSE_WEAPON, { ...holy, definition: [`item:id:${PICK}`, 'item:trait:thrown'] }]);
    const stray = 'item:id:{item|flags.system.rulesSelections.other}';
    const { untranslated } = translated([CHOOSE_WEAPON, { ...holy, definition: [stray] }]);

    expect(rules[1]).toMatchObject({ strikes: ['item:picked:edge-weapon', 'item:trait:thrown'] });
    expect(untranslated.map(({ key }) => key)).toContain(RuleElementKey.AdjustStrike);
  });
});

describe('the picked: lint', () => {
  test('a rule naming a pick no ChoiceSet declares is dangling', () => {
    expect(danglingPick({ selector: ['picked:edge-weapon-damage'] }, new Set())).toBe(true);
    expect(danglingPick({ items: ['item:picked:edge-weapon'] }, new Set(['edge-weapon']))).toBe(false);
    expect(danglingPick({ selector: ['strike-damage'] }, new Set())).toBe(false);
  });

  test('only the picks of a ChoiceSet over owned items are rewritten', () => {
    const raw = { key: RuleElementKey.DamageDice, selector: `${PICK}-damage` };

    expect(withOwnedPicks(raw, new Set())).toBe(raw);
    expect(ownedFlagsOf([CHOOSE_WEAPON, { key: RuleElementKey.ChoiceSet, flag: 'other', choices: [] }])).toEqual(
      new Set(['edgeWeapon']),
    );
  });
});

describe('a ChoiceSet over owned items that shares its flag', () => {
  test('is kept for the backlog with its readers, as Foundry flags a ChoiceSet without one by its item', () => {
    const listed = { key: RuleElementKey.ChoiceSet, choices: [{ value: 'one', label: 'One' }], rollOption: 'which' };
    const owned = { ...CHOOSE_WEAPON, flag: 'spiritEdge' };
    const reads = { ...SPIRIT_DICE, selector: '{item|flags.system.rulesSelections.spiritEdge}-damage' };

    const { rules, untranslated } = translated([listed, owned, reads]);

    expect(rules.map(({ key }) => key)).toEqual([RuleElementKey.ChoiceSet]);
    expect(untranslated.map(({ key }) => key)).toEqual([RuleElementKey.ChoiceSet, RuleElementKey.DamageDice]);
  });
});
