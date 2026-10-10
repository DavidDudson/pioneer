import { describe, expect, test } from 'bun:test';

import { fieldIssues, message, ValidationMessage } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import { ContentEntry } from './content-entry';
import { contentId, PackId, Slug } from './content-id';
import { RulesMessage } from './messages';

function issues(value: unknown): readonly FieldIssue[] {
  const result = ContentEntry.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

/** Each issue as `<path> <message key>`, sorted. */
function found(value: unknown): readonly string[] {
  return issues(value)
    .map((issue) => `${issue.path.join('.')} ${issue.message.key}`)
    .toSorted();
}

const PACK = 'player-core';
const idOf = (slug: string): string => contentId(PackId.parse(PACK), Slug.parse(slug));
const prose = (text: string): unknown[] => [{ type: 'paragraph', content: [{ type: 'text', text }] }];

/** The envelope of a Player Core entry, without its kind and data. */
function entry(slug: string, name: string): object {
  return {
    id: idOf(slug),
    pack: PACK,
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description: prose(name),
    rules: [],
  };
}

const offGuard = idOf('off-guard');
const immobilized = idOf('immobilized');
const grabbed = {
  ...entry('grabbed', 'Grabbed'),
  kind: 'condition',
  rules: [
    { key: 'GrantItem', item: offGuard },
    { key: 'GrantItem', item: immobilized },
  ],
  data: { valued: false, overrides: [], implies: [offGuard, immobilized] },
};

const frightened = {
  ...entry('frightened', 'Frightened'),
  kind: 'condition',
  rules: [{ key: 'FlatModifier', selectors: ['all'], type: 'status', value: -1 }],
  data: { valued: true, overrides: [], implies: [] },
};

const blinded = {
  ...entry('blinded', 'Blinded'),
  kind: 'condition',
  data: { valued: false, group: 'senses', overrides: [idOf('dazzled')], implies: [] },
};

const aidAction = {
  ...entry('aid', 'Aid'),
  kind: 'action',
  data: {
    cost: 'reaction',
    requirements: prose('The ally is willing to accept your aid, and you have prepared to help.'),
    trigger: prose('An ally is about to use an action that requires a skill check or attack roll.'),
  },
};

const raiseAShield = {
  ...entry('raise-a-shield', 'Raise a Shield'),
  kind: 'action',
  data: { cost: 'one', category: 'defensive', selfEffect: idOf('effect-raise-a-shield') },
};

const fire = { ...entry('fire', 'Fire'), kind: 'damage-type', data: {} };
const darkvision = {
  ...entry('darkvision', 'Darkvision'),
  kind: 'sense',
  data: { acuity: 'precise', unlimitedRange: true },
};
const draconic = { ...entry('draconic', 'Draconic'), kind: 'language', data: {} };
const freeArchetype = { ...entry('free-archetype', 'Free Archetype'), kind: 'variant-rule', data: {} };
const manipulate = {
  ...entry('manipulate', 'Manipulate'),
  kind: 'trait',
  data: { appliesTo: ['action', 'feat'] },
};

describe('rules core kinds', () => {
  test.each([
    ['a condition that implies others', grabbed],
    ['a valued condition', frightened],
    ['a grouped condition that overrides another', blinded],
    ['a reaction', aidAction],
    ['an action with a self effect', raiseAShield],
    ['a damage type', fire],
    ['a sense', darkvision],
    ['a language', draconic],
    ['a variant rule', freeArchetype],
    ['a trait', manipulate],
  ])('accepts %s', (_name, value) => {
    expect(issues(value)).toStrictEqual([]);
  });

  test('a condition grants every condition it implies', () => {
    const ungranted = { ...grabbed, rules: [grabbed.rules[0]] };

    expect(issues(ungranted)).toStrictEqual([
      { path: ['data', 'implies', 1], message: message(RulesMessage.ConditionImpliesWithoutGrant) },
    ]);
  });

  test('a grant from a choice does not count as an implied condition', () => {
    const fromChoice = { ...grabbed, rules: [{ key: 'GrantItem', item: { choice: 'condition' } }] };

    expect(found(fromChoice)).toStrictEqual([
      `data.implies.0 ${RulesMessage.ConditionImpliesWithoutGrant}`,
      `data.implies.1 ${RulesMessage.ConditionImpliesWithoutGrant}`,
    ]);
  });

  test('a grant behind a predicate does not apply an implied condition', () => {
    const [offGuardGrant, immobilizedGrant] = grabbed.rules;
    const sometimes = {
      ...grabbed,
      rules: [{ ...offGuardGrant, predicate: ['self:action:grapple'] }, immobilizedGrant],
    };

    expect(issues(sometimes)).toStrictEqual([
      { path: ['data', 'implies', 0], message: message(RulesMessage.ConditionImpliesWithoutGrant) },
    ]);
  });

  test('a trait lists each kind once', () => {
    expect(issues({ ...manipulate, data: { appliesTo: ['action', 'feat', 'action'] } })).toStrictEqual([
      { path: ['data', 'appliesTo', 2], message: message(RulesMessage.TraitDuplicateKind, { kind: 'action' }) },
    ]);
  });

  test('a reaction needs a trigger', () => {
    const { trigger: _trigger, ...untriggered } = aidAction.data;

    expect(issues({ ...aidAction, data: untriggered })).toStrictEqual([
      { path: ['data', 'trigger'], message: message(RulesMessage.ActionReactionTrigger) },
    ]);
    expect(issues({ ...aidAction, data: { ...untriggered, cost: 'free' } })).toStrictEqual([]);
  });

  test('checks action costs, categories and frequencies', () => {
    const invalid = {
      ...raiseAShield,
      data: { cost: 'four', category: 'social', frequency: { max: 0, per: 'PT1H' } },
    };

    expect(found(invalid)).toStrictEqual([
      `data.category ${ValidationMessage.InvalidValue}`,
      `data.cost ${ValidationMessage.InvalidValue}`,
      `data.frequency.max ${ValidationMessage.TooSmall}`,
      `data.frequency.per ${ValidationMessage.InvalidValue}`,
    ]);
  });

  test('checks condition, sense and trait fields', () => {
    expect(found({ ...blinded, data: { ...blinded.data, group: 'mood' } })).toStrictEqual([
      `data.group ${ValidationMessage.InvalidValue}`,
    ]);
    expect(found({ ...darkvision, data: { acuity: 'keen' } })).toStrictEqual([
      `data.acuity ${ValidationMessage.InvalidValue}`,
    ]);
    expect(found({ ...manipulate, data: { appliesTo: ['spellbook'] } })).toStrictEqual([
      `data.appliesTo.0 ${ValidationMessage.InvalidValue}`,
    ]);
  });

  test('needs a condition to say whether it is valued', () => {
    const { valued: _valued, ...unvalued } = frightened.data;

    expect(found({ ...frightened, data: unvalued })).toStrictEqual([`data.valued ${ValidationMessage.InvalidType}`]);
  });

  test('rejects data fields a kind does not have', () => {
    expect(found({ ...draconic, data: { speakers: 'dragons' } })).toStrictEqual([
      `data.speakers ${ValidationMessage.UnrecognizedKeys}`,
    ]);
    expect(found({ ...fire, data: { group: 'energy' } })).toStrictEqual([
      `data.group ${ValidationMessage.UnrecognizedKeys}`,
    ]);
    expect(found({ ...freeArchetype, data: { enabled: true } })).toStrictEqual([
      `data.enabled ${ValidationMessage.UnrecognizedKeys}`,
    ]);
  });
});
