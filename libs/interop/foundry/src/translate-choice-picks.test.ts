import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, RuleElementKey } from '@pioneer/rules/sdk';

import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

const YES_NO = [
  { label: 'PF2E.Yes', value: 'yes' },
  { label: 'PF2E.No', value: 'no' },
];

function translated(raw: object, item = 'Align the Stars'): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: { PF2E: { Yes: 'Yes', No: 'No' } }, values: { item } });
}

function raise(path: string): object {
  return { key: 'ActiveEffectLike', mode: 'upgrade', path, value: 1 };
}

describe('ChoiceSet from Foundry: a pick an ActiveEffectLike reads', () => {
  test('the skills config with a predicate on the skill offers each skill while it holds', () => {
    const pick = {
      choices: { config: 'skills', predicate: ['skill:{choice|value}:rank:0'] },
      flag: 'firstTrainedSkill',
      key: RuleElementKey.ChoiceSet,
    };
    const { rules, untranslated } = translateRules(
      ENTRY,
      [pick, raise('system.skills.{item|flags.system.rulesSelections.firstTrainedSkill}')],
      { lang: {}, values: { item: 'Officer’s Education' } },
    );

    expect(untranslated).toEqual([]);
    const { choices } = rules[0] as unknown as { choices: { value: string; predicate: string[] }[] };
    expect(choices).toHaveLength(16);
    expect(choices[0]).toMatchObject({ value: 'acrobatics', predicate: ['skill:acrobatics:rank:0'] });
    expect(rules[1] as unknown).toEqual({
      key: 'Proficiency',
      selector: { choice: 'first-trained-skill', prefix: 'skill' },
      rank: 'trained',
    });
  });

  test('choices that are skills’ rank paths offer the skills, and the upgrade of the pick raises the one picked', () => {
    const pick = {
      choices: [
        { label: 'PF2E.Skill.Arcana', value: 'system.skills.arcana.rank' },
        { label: 'PF2E.Skill.Nature', value: 'system.skills.nature.rank' },
      ],
      flag: 'elementalLore',
      key: RuleElementKey.ChoiceSet,
    };
    const { rules, untranslated } = translateRules(
      ENTRY,
      [pick, raise('{item|flags.system.rulesSelections.elementalLore}')],
      { lang: { PF2E: { Skill: { Arcana: 'Arcana', Nature: 'Nature' } } }, values: { item: 'Elemental Lore' } },
    );

    expect(untranslated).toEqual([]);
    expect((rules[0] as { choices: unknown }).choices).toEqual([
      { label: 'Arcana', value: 'arcana' },
      { label: 'Nature', value: 'nature' },
    ]);
    expect(rules[1] as unknown).toEqual({
      key: 'Proficiency',
      selector: { choice: 'elemental-lore', prefix: 'skill' },
      rank: 'trained',
    });
  });

  test('priority only orders the rule in Foundry, so it is dropped', () => {
    const { rules, untranslated } = translated({
      choices: YES_NO,
      flag: 'pick',
      key: RuleElementKey.ChoiceSet,
      priority: 5,
      rollOption: 'pick',
    });

    expect(untranslated).toEqual([]);
    expect(rules[0]).not.toHaveProperty('priority');
  });
});

describe('ChoiceSet from Foundry: a config Pioneer has a meaning for', () => {
  test('the ranks config offers ranks one to ten', () => {
    const { rules, untranslated } = translated({
      choices: { config: 'ranks' },
      flag: 'rank',
      rollOption: 'rank-pick',
      key: RuleElementKey.ChoiceSet,
    });

    expect(untranslated).toEqual([]);
    const { choices } = rules[0] as { choices: { value: string; label: string }[] };
    expect(choices).toHaveLength(10);
    expect(choices[0]).toEqual({ value: '1', label: 'Rank 1' });
    expect(choices[9]).toEqual({ value: '10', label: 'Rank 10' });
  });

  test('the baseWeaponTypes config is a query of weapons', () => {
    const { rules, untranslated } = translated({
      choices: { config: 'baseWeaponTypes' },
      flag: 'weaponOne',
      rollOption: 'weapon-one',
      key: RuleElementKey.ChoiceSet,
    });

    expect(untranslated).toEqual([]);
    expect((rules[0] as { choices: unknown }).choices).toEqual({ kind: ContentKind.Weapon, filter: [] });
  });
});
