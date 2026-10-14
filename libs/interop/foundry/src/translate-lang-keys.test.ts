import { describe, expect, test } from 'bun:test';

import { RuleElement } from '@pioneer/rules/sdk';

import { UnresolvedTextReason } from './foundry-lang';
import type { FoundryLang } from './foundry-release';
import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';

const lang: FoundryLang = {
  PF2E: {
    Skill: { Arcana: 'Arcana', Nature: 'Nature' },
    SpecificRule: {
      Prompt: { Skill: 'Select a skill.' },
      HuntPrey: { Label: 'Hunted Prey' },
      Numbers: { Ordinals: { First: 'First' } },
      PlayingItem: 'Playing {item}',
      OriginLabel: 'Granted by {origin}',
      Note: 'You hum @Localize[PF2E.SpecificRule.HuntPrey.Label].',
    },
  },
};

function feat(rules: readonly object[], description = ''): DocumentFixture {
  return {
    id: 'lUtEfEaT00000000',
    name: 'Lute Song',
    type: 'feat',
    system: { rules, description: { value: description } },
  };
}

const choices = [
  { value: 'arcana', label: 'PF2E.Skill.Arcana' },
  { value: 'nature', label: 'PF2E.Skill.Nature' },
];
const choiceSet = { key: 'ChoiceSet', flag: 'skill', prompt: 'PF2E.SpecificRule.Prompt.Skill', choices };
const modifier = { key: 'FlatModifier', selectors: ['ac'], type: 'circumstance', value: 1 };
const entry = idOf('feat:lute-song');

describe('translateRules: lang keys', () => {
  test("resolves a ChoiceSet's prompt and choice labels", () => {
    const { entries, envelopes } = translate([feat([choiceSet])], { lang });

    expect(entries[0]?.envelope.rules).toEqual([
      RuleElement.parse({
        ...choiceSet,
        prompt: 'Select a skill.',
        choices: [
          { value: 'arcana', label: 'Arcana' },
          { value: 'nature', label: 'Nature' },
        ],
      }),
    ]);
    expect(envelopes.unresolvedText).toEqual([]);
  });

  test("resolves a RollOption's label into display.label, and its suboption labels", () => {
    const toggle = {
      key: 'RollOption',
      option: 'self:hunted-prey',
      toggleable: true,
      label: 'PF2E.SpecificRule.HuntPrey.Label',
      suboptions: [{ value: 'first', label: 'PF2E.SpecificRule.Numbers.Ordinals.First' }],
    };

    expect(translate([feat([toggle])], { lang }).entries[0]?.envelope.rules).toEqual([
      RuleElement.parse({
        key: 'RollOption',
        option: 'self:hunted-prey',
        toggleable: true,
        suboptions: [{ value: 'first', label: 'First' }],
        display: { label: 'Hunted Prey' },
      }),
    ]);
  });

  test("fills {item} with the entry's name and keeps words that are not a key", () => {
    const rules = [
      { ...modifier, label: 'PF2E.SpecificRule.PlayingItem' },
      { ...modifier, label: 'Inspired', display: { hidden: true } },
    ];

    expect(translate([feat(rules)], { lang }).entries[0]?.envelope.rules).toEqual([
      RuleElement.parse({ ...modifier, display: { label: 'Playing Lute Song' } }),
      RuleElement.parse({ ...modifier, display: { hidden: true, label: 'Inspired' } }),
    ]);
  });

  test('leaves out and reports text that does not resolve, never writing the key', () => {
    const rules = [
      { ...choiceSet, prompt: 'PF2E.SpecificRule.Prompt.Nope' },
      { ...modifier, label: 'PF2E.SpecificRule.OriginLabel' },
      { ...modifier, label: 'PF2E.SpecificRule.{actor|class.slug}.Label' },
    ];
    const { entries, envelopes } = translate([feat(rules)], { lang });

    expect(entries[0]?.envelope.rules).toEqual([
      RuleElement.parse({
        key: 'ChoiceSet',
        flag: 'skill',
        choices: [
          { value: 'arcana', label: 'Arcana' },
          { value: 'nature', label: 'Nature' },
        ],
      }),
      RuleElement.parse(modifier),
      RuleElement.parse(modifier),
    ]);
    expect(envelopes.unresolvedText).toEqual([
      { entry, key: 'PF2E.SpecificRule.Prompt.Nope', reason: UnresolvedTextReason.MissingKey },
      { entry, key: 'PF2E.SpecificRule.OriginLabel', reason: UnresolvedTextReason.RuntimePlaceholder },
      { entry, key: 'PF2E.SpecificRule.{actor|class.slug}.Label', reason: UnresolvedTextReason.RuntimeKey },
    ]);
  });

  test('sends a ChoiceSet to the backlog when a choice has no label, rather than offer fewer choices', () => {
    const unlabelled = { ...choiceSet, choices: [...choices, { value: 'occultism', label: 'PF2E.Skill.Occultism' }] };
    const { entries, envelopes } = translate([feat([unlabelled])], { lang });

    expect(entries[0]?.envelope.rules).toEqual([]);
    expect(envelopes.untranslatedRules).toEqual([{ entry, key: 'ChoiceSet', raw: unlabelled }]);
    expect(envelopes.unresolvedText).toEqual([
      { entry, key: 'PF2E.Skill.Occultism', reason: UnresolvedTextReason.MissingKey },
    ]);
  });

  test("keeps Foundry's raw JSON, keys and all, for an element that does not translate", () => {
    const note = { key: 'Note', selector: 'perception', text: 'PF2E.Nope' };
    const { envelopes } = translate([feat([note])], { lang });

    expect(envelopes.untranslatedRules).toEqual([{ entry, key: 'Note', raw: note }]);
    expect(envelopes.unresolvedText).toEqual([{ entry, key: 'PF2E.Nope', reason: UnresolvedTextReason.MissingKey }]);
  });
});

describe('describeEntries: @Localize', () => {
  test('inlines the lang text into the description and reports a key without one', () => {
    const description = '<p>@Localize[PF2E.SpecificRule.Note] @Localize[PF2E.Nope]</p>';
    const { entries, envelopes } = translate([feat([], description)], { lang });
    const described: unknown = entries[0]?.envelope.description;

    expect(described).toEqual([{ type: 'paragraph', content: [{ type: 'text', text: 'You hum Hunted Prey.' }] }]);
    expect(envelopes.unresolvedText).toEqual([{ entry, key: 'PF2E.Nope', reason: UnresolvedTextReason.MissingKey }]);
    expect(envelopes.untranslatedEnrichers).toEqual([]);
  });
});
