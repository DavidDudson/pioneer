import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { Fields } from './translate-choice-reads';
import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

const Choice = z.object({ value: z.string(), predicate: z.array(z.string()) });
const ChoiceRule = z.object({ choices: z.array(Choice) });

const YES_NO = [
  { label: 'PF2E.Yes', value: 'yes' },
  { label: 'PF2E.No', value: 'no' },
];

function translated(raw: Fields, item = 'Align the Stars'): RuleTranslation {
  return translateRules(ENTRY, [raw], { lang: { PF2E: { Yes: 'Yes', No: 'No' } }, values: { item } });
}

function raise(path: string): Fields {
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
    const { choices } = ChoiceRule.parse(rules[0]);
    expect(choices).toHaveLength(16);
    expect(choices[0]).toMatchObject({ value: 'acrobatics', predicate: ['skill:acrobatics:rank:0'] });
    // SAFETY: widening only: an array of rule elements is assignable to readonly unknown[].
    // The wider type lets toEqual take the partial expected literals.
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
    // SAFETY: the input is the rule under test, so rules[0] is its translation.
    // The cast names only the fields the test reads from that element.
    expect((rules[0] as { choices: unknown }).choices).toEqual([
      { label: 'Arcana', value: 'arcana' },
      { label: 'Nature', value: 'nature' },
    ]);
    // SAFETY: widening only: an array of rule elements is assignable to readonly unknown[].
    // The wider type lets toEqual take the partial expected literals.
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
    // SAFETY: the input is the rule under test, so rules[0] is its translation.
    // The cast names only the fields the test reads from that element.
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
    // SAFETY: the input is the rule under test, so rules[0] is its translation.
    // The cast names only the fields the test reads from that element.
    expect((rules[0] as { choices: unknown }).choices).toEqual({ kind: ContentKind.Weapon, filter: [] });
  });
});

describe('ChoiceSet from Foundry: a pick whose reader is kept for the backlog', () => {
  const PICK = { choices: YES_NO, flag: 'fighterSkill', key: RuleElementKey.ChoiceSet, rollOption: 'fighter-skill' };

  test('is not offered, so the pick and its reader stay together', () => {
    const reader = { key: 'TempHP', value: '@item.flags.system.rulesSelections.fighterSkill' };

    const { rules, untranslated } = translateRules(ENTRY, [PICK, reader], {
      lang: { PF2E: { Yes: 'Yes', No: 'No' } },
      values: { item: 'Pick' },
    });

    expect(rules).toEqual([]);
    expect(untranslated.map(({ key }) => key)).toEqual([RuleElementKey.ChoiceSet, 'TempHP']);
  });

  test('is offered when the element that fails does not read it', () => {
    const other = { key: 'TempHP', value: '@actor.level+@item.flags.system.rulesSelections.otherPick' };

    const { rules, untranslated } = translateRules(ENTRY, [PICK, other], {
      lang: { PF2E: { Yes: 'Yes', No: 'No' } },
      values: { item: 'Pick' },
    });

    expect(rules.map(({ key }) => key)).toEqual([RuleElementKey.ChoiceSet]);
    expect(untranslated.map(({ key }) => key)).toEqual(['TempHP']);
  });
});
