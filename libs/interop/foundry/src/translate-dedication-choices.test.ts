import { describe, expect, test } from 'bun:test';

import { ContentId } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000001');
const CONTEXT = { lang: {}, values: { item: 'Bard Dedication' } };

const NOT_ARCHETYPE = { not: 'item:tag:class-archetype' };

/** Bard Dedication's muse: a query of class features by tag, and the option naming the pick. */
const MUSE = [
  {
    key: 'ChoiceSet',
    flag: 'dedicationMuse',
    prompt: 'PF2E.SpecificRule.Bard.Muse.Prompt',
    choices: { filter: ['item:tag:bard-muse', NOT_ARCHETYPE], slugsAsValues: true },
  },
  { key: 'RollOption', option: 'feature:{item|flags.system.rulesSelections.dedicationMuse}' },
];

/** Druid Dedication's order: the same query, and a grant of the pick. */
const ORDER = [
  {
    key: 'ChoiceSet',
    flag: 'druidicOrder',
    adjustName: false,
    prompt: 'PF2E.SpecificRule.Druid.DruidicOrder.Prompt',
    choices: { filter: ['item:tag:druid-order', NOT_ARCHETYPE] },
  },
  { key: 'GrantItem', uuid: '{item|flags.system.rulesSelections.druidicOrder}' },
];

describe('a class dedication’s choice of muse, order or school', () => {
  test('is a query of the class features with the tag, less the class archetypes’ own', () => {
    const { rules, untranslated } = translateRules(ENTRY, MUSE, CONTEXT);

    expect(untranslated).toEqual([]);
    expect(rules[0]).toMatchObject({
      key: 'ChoiceSet',
      flag: 'dedication-muse',
      choices: { kind: 'class-feature', filter: ['item:tag:bard-muse', NOT_ARCHETYPE] },
    });
  });

  test('sets the roll option the feat’s RollOption named, as the ChoiceSet’s own', () => {
    const { rules } = translateRules(ENTRY, MUSE, CONTEXT);

    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ rollOption: 'feature' });
  });

  test('is granted, for an order, as the pick', () => {
    const { rules, untranslated } = translateRules(ENTRY, ORDER, CONTEXT);

    expect(untranslated).toEqual([]);
    expect(rules).toMatchObject([
      { key: 'ChoiceSet', flag: 'druidic-order', choices: { kind: 'class-feature' } },
      { key: 'GrantItem', item: { choice: 'druidic-order' } },
    ]);
  });

  test('keeps a RollOption for a pick no ChoiceSet of the item makes', () => {
    const [, option] = MUSE;
    const { untranslated } = translateRules(ENTRY, [option], CONTEXT);

    expect(untranslated).toHaveLength(1);
  });

  test('keeps a RollOption that is conditional, and the pick it reads, which a roll option would make unconditional', () => {
    const [choice, option] = MUSE;
    const conditional = { ...option, predicate: ['feat:bard-dedication'] };
    const { rules, untranslated } = translateRules(ENTRY, [choice, conditional], CONTEXT);

    expect(rules).toEqual([]);
    expect(untranslated).toHaveLength(2);
  });

  test('is left for the backlog when a filter holds something other than a tag', () => {
    const odd = { ...MUSE[0], choices: { filter: ['item:level:1'], slugsAsValues: true } };
    const { untranslated } = translateRules(ENTRY, [odd], CONTEXT);

    expect(untranslated).toHaveLength(1);
  });
});
