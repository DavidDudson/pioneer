import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import { rulesIn } from './testing/build-helpers';
import { coreRulesId, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { FOUNDRY_NULL, gapsOf } from './testing/kind-fixtures';

const { Sense } = RuleElementKey;
const DARKVISION = coreRulesId('sense:darkvision');
const SCENT = coreRulesId('sense:scent');

/** A Player Core heritage with `rules`, shaped as `pf2e-8.6.0` has it. */
function heritage(rules: readonly object[]): DocumentFixture {
  return {
    id: 'hErItAgE00000000',
    name: 'Cavern Elf',
    type: 'heritage',
    system: { ancestry: FOUNDRY_NULL, rules, traits: { rarity: 'common', value: [] } },
  };
}

/** A passive feat of `category` with `subfeatures`. */
function feat(subfeatures: object, category = 'general'): DocumentFixture {
  return {
    id: 'sEnSeFeAt0000000',
    name: 'Keen Feat',
    type: 'feat',
    system: {
      category,
      actionType: { value: 'passive' },
      actions: { value: FOUNDRY_NULL },
      level: { value: 1 },
      traits: { rarity: 'common', value: [] },
      subfeatures,
    },
  };
}

function heritageRules(rules: readonly object[]): unknown[] {
  const translation = translate([heritage(rules)]);
  return rulesIn(translation, 'cavern-elf');
}

describe('translateRules: Sense', () => {
  test('a Sense names its sense entry, keeping its acuity, range and base fields', () => {
    const rule = {
      key: 'Sense',
      selector: 'scent',
      acuity: 'imprecise',
      range: 30,
      predicate: ['shifting-form:scent'],
      priority: 10,
      label: 'Keen nose',
    };

    expect(heritageRules([rule])).toEqual([
      {
        key: Sense,
        sense: SCENT,
        acuity: 'imprecise',
        range: 30,
        predicate: ['shifting-form:scent'],
        priority: 10,
        display: { label: 'Keen nose' },
      },
    ]);
  });

  test('a sense that fixes its acuity and has no limit drops what Foundry ignores', () => {
    const rule = { key: 'Sense', selector: 'darkvision', acuity: 'imprecise', range: 30, force: false };

    expect(heritageRules([rule])).toEqual([{ key: Sense, sense: DARKVISION }]);
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
  test.each([
    ['a feat', 'general'],
    ['a class feature', 'classfeature'],
  ])("%s's subfeature senses are Sense elements, and its other subfeatures are reported by name", (_case, category) => {
    const proficiencies = { perception: { rank: 2 } };
    const subfeatures = { senses: { darkvision: { acuity: 'imprecise', range: 30 } }, proficiencies };
    const translation = translate([feat(subfeatures, category)]);

    expect(rulesIn(translation, 'keen-feat')).toEqual([{ key: Sense, sense: DARKVISION }]);
    expect(gapsOf(translation)).toEqual([
      { reason: KindDataGapReason.UnmappedField, field: 'subfeatures.proficiencies', raw: proficiencies },
    ]);
  });

  test('a subfeature sense with acuity and range keeps them, and adds its sense to the vocabulary', () => {
    const translation = translate([feat({ senses: { scent: { acuity: 'imprecise', range: 60 } } })]);
    const vocabulary = translation.vocabulary.map(({ envelope }) => String(envelope.slug));

    expect(rulesIn(translation, 'keen-feat')).toEqual([{ key: Sense, sense: SCENT, acuity: 'imprecise', range: 60 }]);
    expect(vocabulary).toContain('sense:scent');
  });

  test('a subfeature sense outside the vocabulary is reported', () => {
    const fields = { acuity: 'imprecise', range: 60 };
    const translation = translate([feat({ senses: { spiritsense: fields } })]);

    expect(rulesIn(translation, 'keen-feat')).toEqual([]);
    expect(gapsOf(translation)).toEqual([
      { reason: KindDataGapReason.UnresolvedReference, field: 'subfeatures.senses.spiritsense', raw: fields },
    ]);
  });

  test.each([
    ['senses that are no record', ['darkvision'], 'subfeatures.senses'],
    ['a sense that is no object', { scent: 'imprecise' }, 'subfeatures.senses'],
    ['a range of 0', { scent: { range: 0 } }, 'subfeatures.senses.scent'],
  ])('%s is reported as invalid, and adds no element', (_case, senses, field) => {
    const translation = translate([feat({ senses })]);
    const gaps = gapsOf(translation).map((gap) => [gap.reason, gap.field]);

    expect(rulesIn(translation, 'keen-feat')).toEqual([]);
    expect(gaps).toEqual([[KindDataGapReason.InvalidData, field]]);
  });
});
