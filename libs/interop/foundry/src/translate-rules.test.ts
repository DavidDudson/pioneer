import { describe, expect, test } from 'bun:test';

import { ConditionValue } from '@pioneer/rules/sdk';

import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { condition, dataOf } from './testing/kind-fixtures';

const BLINDED = condition('XgEqL1kFApUbl5Z2', 'Blinded');

/** A condition granting Blinded with `onDeleteActions`, or none. */
function granting(onDeleteActions?: object): DocumentFixture {
  const grant = { key: 'GrantItem', uuid: 'Compendium.pf2e.conditionitems.Item.Blinded' };
  return condition('gRaNtEr000000000', 'Granter', {
    rules: [onDeleteActions === undefined ? grant : { ...grant, onDeleteActions }],
  });
}

const LONGSWORD: DocumentFixture = { id: 'lOnGsWoRd0000000', name: 'Longsword', type: 'weapon' };

describe('translateRules: GrantItem delete actions', () => {
  test.each([
    ['no delete actions', undefined],
    ['granter cascade', { granter: 'cascade' }],
    ['granter cascade, grantee restrict', { granter: 'cascade', grantee: 'restrict' }],
    ['grantee restrict', { grantee: 'restrict' }],
    ['grantee detach', { grantee: 'detach' }],
  ])('%s: a grant of a condition goes with its granter, so it is derived and implied', (_case, actions) => {
    const translation = translate([granting(actions), BLINDED]);

    expect(dataOf([granting(actions), BLINDED], 'granter')).toMatchObject({ implies: [idOf('condition:blinded')] });
    expect(translation.entries[0]?.envelope.rules).toEqual([{ key: 'GrantItem', item: idOf('condition:blinded') }]);
  });

  test.each([
    ['granter detach', { granter: 'detach' }],
    ['granter restrict', { granter: 'restrict' }],
    ['grantee cascade', { grantee: 'cascade' }],
    ['an unknown action', { granter: 'vanish' }],
  ])('%s: the grant is no derived grant, so it is kept for the backlog', (_case, actions) => {
    const translation = translate([granting(actions), BLINDED]);

    expect(translation.envelopes.untranslatedRules.map(({ key }) => key)).toEqual(['GrantItem']);
  });

  test('a grant of a physical item detaches unless it says otherwise, so it is kept for the backlog', () => {
    const feat: DocumentFixture = {
      id: 'wEaPoNfEaT000000',
      name: 'Weapon Gift',
      type: 'feat',
      system: { rules: [{ key: 'GrantItem', uuid: 'Compendium.pf2e.weapon-srd.Item.Longsword' }] },
    };
    const cascading: DocumentFixture = {
      ...feat,
      system: {
        rules: [
          {
            key: 'GrantItem',
            uuid: 'Compendium.pf2e.weapon-srd.Item.Longsword',
            onDeleteActions: { granter: 'cascade' },
          },
        ],
      },
    };

    expect(translate([feat, LONGSWORD]).envelopes.untranslatedRules.map(({ key }) => key)).toEqual(['GrantItem']);
    expect(translate([cascading, LONGSWORD]).envelopes.untranslatedRules).toEqual([]);
  });
});

describe('translateRules: GrantItem badge value', () => {
  const grant = { key: 'GrantItem', uuid: 'Compendium.pf2e.conditionitems.Item.Blinded' };
  const altering = (alterations: readonly object[]): DocumentFixture =>
    condition('gRaNtEr000000000', 'Granter', { rules: [{ ...grant, alterations }] });

  test("an override of the badge value is the grant's value", () => {
    const fixtures = [altering([{ mode: 'override', property: 'badge-value', value: 3 }]), BLINDED];

    expect(translate(fixtures).entries[0]?.envelope.rules).toEqual([
      { key: 'GrantItem', item: idOf('condition:blinded'), value: ConditionValue.parse(3) },
    ]);
  });

  test.each([
    ['a value read from a pick', [{ mode: 'override', property: 'badge-value', value: '{item|flags.x}' }]],
    ['a value of 0', [{ mode: 'override', property: 'badge-value', value: 0 }]],
    ['another property', [{ mode: 'override', property: 'description', value: 'x' }]],
    [
      'a second alteration',
      [
        { mode: 'override', property: 'badge-value', value: 2 },
        { mode: 'override', property: 'description', value: 'x' },
      ],
    ],
  ])('%s is kept for the backlog', (_case, alterations) => {
    const translation = translate([altering(alterations), BLINDED]);

    expect(translation.envelopes.untranslatedRules.map(({ key }) => key)).toEqual(['GrantItem']);
  });
});

const feat = (raw: object): DocumentFixture => ({
  id: 'cRiTsPeC00000000',
  name: 'Weapon Familiarity',
  type: 'feat',
  system: { rules: [raw] },
});

describe('translateRules: CriticalSpecialization', () => {
  test.each([
    [
      'a level-gated list of bases and a trait',
      { predicate: [{ gte: ['self:level', 5] }, { or: ['item:trait:dwarf', 'item:base:war-hammer'] }] },
    ],
    ['a group', { predicate: ['item:group:firearm'] }],
    ['no predicate', {}],
  ])('%s is translated, with its roll options namespaced', (_case, fields) => {
    const translation = translate([feat({ key: 'CriticalSpecialization', ...fields })]);

    expect(translation.envelopes.untranslatedRules).toEqual([]);
    expect(translation.entries[0]?.envelope.rules.map(({ key }) => key)).toEqual(['CriticalSpecialization']);
  });

  test('a predicate that reads a pick by id is kept for the backlog', () => {
    const raw = { key: 'CriticalSpecialization', predicate: ['item:id:{item|flags.system.rulesSelections.weapon}'] };

    expect(translate([feat(raw)]).envelopes.untranslatedRules.map(({ key }) => key)).toEqual([
      'CriticalSpecialization',
    ]);
  });
});
