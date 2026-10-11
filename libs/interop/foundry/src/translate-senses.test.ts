import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import { rulesIn } from './testing/build-helpers';
import { coreRulesId, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { FOUNDRY_NULL, gapsOf } from './testing/kind-fixtures';

const { Sense } = RuleElementKey;
const DARKVISION = coreRulesId('sense:darkvision');

/** A Player Core heritage with `rules`, shaped as `pf2e-8.6.0` has it. */
function heritage(rules: readonly object[]): DocumentFixture {
  return {
    id: 'hErItAgE00000000',
    name: 'Cavern Elf',
    type: 'heritage',
    system: { ancestry: FOUNDRY_NULL, rules, traits: { rarity: 'common', value: [] } },
  };
}

/** A passive general feat with `subfeatures`. */
function feat(subfeatures: object): DocumentFixture {
  return {
    id: 'sEnSeFeAt0000000',
    name: 'Keen Feat',
    type: 'feat',
    system: {
      category: 'general',
      actionType: { value: 'passive' },
      actions: { value: FOUNDRY_NULL },
      level: { value: 1 },
      traits: { rarity: 'common', value: [] },
      subfeatures,
    },
  };
}

describe('translateRules: Sense', () => {
  test('a Sense names its sense entry, with its acuity, range and predicate', () => {
    const rule = { key: 'Sense', selector: 'scent', acuity: 'imprecise', range: 30, predicate: ['shifting-form:scent'] };

    expect(rulesIn(translate([heritage([rule])]), 'cavern-elf')).toEqual([
      {
        key: Sense,
        sense: coreRulesId('sense:scent'),
        acuity: 'imprecise',
        range: 30,
        predicate: ['shifting-form:scent'],
      },
    ]);
  });

  test('a sense that fixes its acuity and has no limit drops what Foundry ignores', () => {
    const rule = { key: 'Sense', selector: 'darkvision', acuity: 'imprecise', range: 30, force: false };

    expect(rulesIn(translate([heritage([rule])]), 'cavern-elf')).toEqual([{ key: Sense, sense: DARKVISION }]);
  });

  test.each([
    ['an unknown sense', { key: 'Sense', selector: 'spiritsense' }],
    ['a forced sense', { key: 'Sense', selector: 'darkvision', force: true }],
    ['a range read from a formula', { key: 'Sense', selector: 'scent', range: '@actor.level' }],
  ])('%s is kept for the backlog', (_case, rule) => {
    const translation = translate([heritage([rule])]);

    expect(translation.envelopes.untranslatedRules.map(({ key }) => key)).toEqual(['Sense']);
  });
});

describe('translateKindData: subfeature senses', () => {
  test("a feat's subfeature senses are Sense elements, and its other subfeatures are reported", () => {
    const translation = translate([
      feat({ senses: { darkvision: { acuity: 'imprecise', range: 30 } }, proficiencies: { perception: { rank: 2 } } }),
    ]);

    expect(rulesIn(translation, 'keen-feat')).toEqual([{ key: Sense, sense: DARKVISION }]);
    expect(gapsOf(translation)).toEqual([
      { reason: KindDataGapReason.UnmappedField, field: 'subfeatures.proficiencies', raw: { perception: { rank: 2 } } },
    ]);
  });

  test('a subfeature sense with acuity and range keeps them, and adds its sense to the vocabulary', () => {
    const translation = translate([feat({ senses: { scent: { acuity: 'imprecise', range: 60 } } })]);

    expect(rulesIn(translation, 'keen-feat')).toEqual([
      { key: Sense, sense: coreRulesId('sense:scent'), acuity: 'imprecise', range: 60 },
    ]);
    expect(translation.vocabulary.map(({ envelope }) => String(envelope.slug))).toContain('sense:scent');
  });

  test('a subfeature sense outside the vocabulary is reported', () => {
    const translation = translate([feat({ senses: { spiritsense: { acuity: 'imprecise', range: 60 } } })]);

    expect(rulesIn(translation, 'keen-feat')).toEqual([]);
    expect(gapsOf(translation)).toEqual([
      {
        reason: KindDataGapReason.UnresolvedReference,
        field: 'subfeatures.senses.spiritsense',
        raw: { acuity: 'imprecise', range: 60 },
      },
    ]);
  });
});
