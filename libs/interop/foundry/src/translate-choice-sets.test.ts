import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, RuleElementKey } from '@pioneer/rules/sdk';

import { NO_REFERENCES } from './entry-references';
import type { EntryReferences } from './entry-references';
import { translateRules } from './translate-rules';
import type { RuleTranslation } from './translate-rules';

const ENTRY = ContentId.parse('00000000-0000-5000-8000-000000000000');

function translated(raw: object, item = 'Align the Stars'): RuleTranslation {
  return translateRules(ENTRY, [raw], {
    lang: { PF2E: { Prompt: 'Pick one.', Yes: 'Yes', No: 'No' } },
    values: { item },
  });
}

const YES_NO = [
  { label: 'PF2E.Yes', value: 'yes' },
  { label: 'PF2E.No', value: 'no' },
];

describe('ChoiceSet from Foundry', () => {
  test('a camel-case flag is a slug, adjustName is dropped and the roll option stays', () => {
    const { rules, untranslated } = translated({
      adjustName: false,
      choices: YES_NO,
      flag: 'inizkarAlly',
      key: RuleElementKey.ChoiceSet,
      prompt: 'PF2E.Prompt',
      rollOption: 'inizkar-ally',
    });

    expect(untranslated).toEqual([]);
    expect(rules as readonly unknown[]).toEqual([
      {
        key: RuleElementKey.ChoiceSet,
        choices: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
        flag: 'inizkar-ally',
        prompt: 'Pick one.',
        rollOption: 'inizkar-ally',
      },
    ]);
  });

  test('a ChoiceSet without a flag takes the slug of its item, as Foundry does', () => {
    const { rules } = translated({ choices: YES_NO, key: RuleElementKey.ChoiceSet, rollOption: 'inizkar-ally' });

    expect((rules[0] as { flag: string }).flag).toBe('align-the-stars');
  });

  test('a number is a text value, an icon is dropped, and a choice predicate reads bare roll options', () => {
    const { rules, untranslated } = translated({
      choices: [
        { img: 'systems/pf2e/icons/one.webp', label: 'PF2E.Yes', value: 1, predicate: ['sheriffs-blessing'] },
        { label: 'PF2E.No', value: 2 },
      ],
      flag: 'rank',
      rollOption: 'rank',
      key: RuleElementKey.ChoiceSet,
    });

    expect(untranslated).toEqual([]);
    expect((rules[0] as { choices: unknown }).choices).toEqual([
      { label: 'Yes', value: '1', predicate: ['option:sheriffs-blessing'] },
      { label: 'No', value: '2' },
    ]);
  });

  test('a choice gated on the level of its item reads item:level', () => {
    const { rules, untranslated } = translated({
      choices: [
        { label: 'PF2E.Yes', value: 'claw' },
        { label: 'PF2E.No', predicate: [{ gte: ['{item|level}', 4] }], value: 'wings' },
      ],
      flag: 'animalFeature',
      key: RuleElementKey.ChoiceSet,
      rollOption: 'animal-feature',
    });

    expect(untranslated).toEqual([]);
    expect((rules[0] as { choices: unknown }).choices).toEqual([
      { label: 'Yes', value: 'claw' },
      { label: 'No', predicate: [{ gte: ['item:level', 4] }], value: 'wings' },
    ]);
  });

  test('allowNoSelection is optional, and a predicate on the parent level carries over', () => {
    const { rules, untranslated } = translated({
      allowNoSelection: true,
      choices: YES_NO,
      flag: 'spellEffectUntamedShiftTwo',
      key: RuleElementKey.ChoiceSet,
      predicate: [{ gte: ['parent:level', 6] }],
      rollOption: 'untamed-shift',
    });

    expect(untranslated).toEqual([]);
    expect(rules[0]).toMatchObject({ optional: true, predicate: [{ gte: ['parent:level', 6] }] });
    expect(rules[0]).not.toHaveProperty('allowNoSelection');
  });

  test('allowNoSelection false is the default and is dropped', () => {
    const { rules } = translated({
      allowNoSelection: false,
      choices: YES_NO,
      flag: 'rank',
      key: RuleElementKey.ChoiceSet,
      rollOption: 'rank',
    });

    expect(rules[0]).not.toHaveProperty('optional');
  });

  test('a roll option may be a namespace of its own', () => {
    const { rules, untranslated } = translated({
      choices: YES_NO,
      flag: 'initial',
      key: RuleElementKey.ChoiceSet,
      rollOption: 'kinetic-gate:initial',
    });

    expect(untranslated).toEqual([]);
    expect((rules[0] as { rollOption: string }).rollOption).toBe('kinetic-gate:initial');
  });

  test('a query by item type is a query of that kind, its filter reading bare roll options', () => {
    const { rules, untranslated } = translated({
      choices: { filter: ['item:category:skill', 'item:level:1', 'blessed'], itemType: 'feat' },
      flag: 'bonusFeat',
      rollOption: 'bonus-feat',
      key: RuleElementKey.ChoiceSet,
    });

    expect(untranslated).toEqual([]);
    expect((rules[0] as { choices: unknown }).choices).toEqual({
      kind: ContentKind.Feat,
      filter: ['item:category:skill', 'item:level:1', 'option:blessed'],
    });
  });

  test('a query on class feature tags alone, filed as feats by Foundry, is a query of class features', () => {
    const { rules, untranslated } = translated({
      choices: { filter: ['item:tag:summoner-eidolon'], itemType: 'feat' },
      flag: 'eidolon',
      rollOption: 'eidolon',
      key: RuleElementKey.ChoiceSet,
    });

    expect(untranslated).toEqual([]);
    expect((rules[0] as { choices: unknown }).choices).toEqual({
      kind: ContentKind.ClassFeature,
      filter: ['item:tag:summoner-eidolon'],
    });
  });

  test("a query's read of its granter's level is a read of the character's level", () => {
    const { rules, untranslated } = translated({
      choices: { filter: [{ lte: ['item:level', 'parent:granter:level'] }, 'item:trait:impulse'], itemType: 'feat' },
      flag: 'impulseOne',
      rollOption: 'impulse-one',
      key: RuleElementKey.ChoiceSet,
    });

    expect(untranslated).toEqual([]);
    expect((rules[0] as { choices: unknown }).choices).toEqual({
      kind: ContentKind.Feat,
      filter: [{ lte: ['item:level', 'self:level'] }, 'item:trait:impulse'],
    });
  });

  test('the skills config offers each skill', () => {
    const { rules, untranslated } = translated({
      choices: { config: 'skills' },
      flag: 'skill',
      rollOption: 'skill-pick',
      key: RuleElementKey.ChoiceSet,
    });

    expect(untranslated).toEqual([]);
    const { choices } = rules[0] as { choices: { value: string; label: string }[] };
    expect(choices).toHaveLength(16);
    expect(choices[0]).toEqual({ value: 'acrobatics', label: 'Acrobatics' });
  });

  test.each([
    ['an object value', { choices: [{ label: 'PF2E.Yes', value: { skill: 'arcana' } }] }],
    ['an unlabelled item pick', { choices: [{ value: 'Compendium.pf2e.feats-srd.Item.Assurance' }] }],
    ['another config', { choices: { config: 'damageTypes' } }],
    ['a query of the deity', { choices: { filter: ['item:type:deity'], itemType: 'deity' } }],
    ['slugs as values', { choices: { filter: ['item:level:1'], itemType: 'spell', slugsAsValues: true } }],
    ['allowedDrops', { choices: YES_NO, allowedDrops: { label: 'PF2E.Yes', predicate: ['item:type:armor'] } }],
    ['actorFlag', { choices: YES_NO, actorFlag: true }],
    ['a slug', { choices: YES_NO, slug: 'chosen' }],
  ])('%s has no Pioneer meaning yet, so the element is kept for the backlog', (_case, extra) => {
    const raw = { flag: 'pick', key: RuleElementKey.ChoiceSet, ...extra };

    expect(translated(raw).untranslated).toEqual([{ entry: ENTRY, key: RuleElementKey.ChoiceSet, raw }]);
  });
});

describe('ChoiceSet from Foundry: a pick nothing reads', () => {
  const PICK = { choices: YES_NO, flag: 'fighterSkill', key: RuleElementKey.ChoiceSet };

  test('without a roll option or an element reading it, it stays in the backlog with the rules that would', () => {
    const { rules, untranslated } = translated(PICK);

    expect(rules).toEqual([]);
    expect(untranslated).toEqual([{ entry: ENTRY, key: RuleElementKey.ChoiceSet, raw: PICK }]);
  });

  test('a grant of the pick reads it, so both are translated', () => {
    const grant = {
      key: RuleElementKey.GrantItem,
      uuid: '{item|flags.system.rulesSelections.fighterSkill}',
    };
    const { rules, untranslated } = translateRules(ENTRY, [PICK, grant], {
      lang: { PF2E: { Yes: 'Yes', No: 'No' } },
      values: { item: 'Fighter' },
    });

    expect(untranslated).toEqual([]);
    expect(rules.map(({ key }) => key)).toEqual([RuleElementKey.ChoiceSet, RuleElementKey.GrantItem]);
  });
});

describe('ChoiceSet from Foundry: choices that name entries by compendium UUID', () => {
  const SOULHEART = ContentId.parse('00000000-0000-5000-8000-000000000001');
  const SOULHEART_GREATER = ContentId.parse('00000000-0000-5000-8000-000000000002');
  const references: EntryReferences = {
    ...NO_REFERENCES,
    byUuid: new Map([
      ['Compendium.pf2e.equipment-srd.Item.Soulheart', SOULHEART],
      ['Compendium.pf2e.equipment-srd.Item.Soulheart (Greater)', SOULHEART_GREATER],
    ]),
  };
  const grant = { key: RuleElementKey.GrantItem, uuid: '{item|flags.system.rulesSelections.armor}' };

  function withReferences(choices: readonly object[]): RuleTranslation {
    const pick = { choices, flag: 'armor', key: RuleElementKey.ChoiceSet };
    return translateRules(ENTRY, [pick, grant], { lang: {}, values: { item: 'Armor' }, references });
  }

  test('each choice is the entry it resolves to, labelled with the name in its UUID', () => {
    const { rules, untranslated } = withReferences([
      { value: 'Compendium.pf2e.equipment-srd.Item.Soulheart', predicate: ['parent:origin:item:slug:soulheart'] },
      { value: 'Compendium.pf2e.equipment-srd.Item.Soulheart (Greater)', label: 'Greater' },
    ]);

    expect(untranslated).toEqual([]);
    expect((rules[0] as { choices: unknown }).choices).toEqual([
      { value: SOULHEART, label: 'Soulheart', predicate: ['parent:origin:item:slug:soulheart'] },
      { value: SOULHEART_GREATER, label: 'Greater' },
    ]);
    expect(rules[1] as unknown).toEqual({ key: RuleElementKey.GrantItem, item: { choice: 'armor' } });
  });

  test('a UUID that does not resolve, or names a document by id, leaves the ChoiceSet in the backlog', () => {
    const unresolved = withReferences([{ value: 'Compendium.pf2e.equipment-srd.Item.Unknown Armor' }]);
    const byId = withReferences([{ value: 'Compendium.pf2e.equipment-srd.Item.AbCdEfGhIjKlMnOp' }]);

    expect(unresolved.rules).toEqual([]);
    expect(byId.rules).toEqual([]);
  });
});
