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

const afterFocusSpell = { event: 'cast-spell', predicate: ['item:trait:focus'] };

/** A free action that fires after a focus spell, with `data` merged over its own. */
function action(data: object = {}): object {
  return {
    ...entry('focused-step', 'Focused Step'),
    kind: 'action',
    data: { cost: 'free', trigger: prose('You cast a focus spell.'), triggerEvent: afterFocusSpell, ...data },
  };
}

/** An effect that fires at the start of the bearer's turn, with `data` merged over its own. */
function effect(data: object = {}): object {
  return {
    ...entry('effect-renewal', 'Effect: Renewal'),
    kind: 'effect',
    data: { category: 'spell', duration: { type: 'encounter' }, triggerEvent: { event: 'turn-start' }, ...data },
  };
}

describe('trigger events', () => {
  test.each([
    ['an action after a focus spell', action()],
    ['an action that always prompts', action({ autoApply: false })],
    ['an effect at the start of a turn', effect()],
    ['an effect that always prompts', effect({ autoApply: false })],
    ['an action with no trigger event', action({ triggerEvent: undefined })],
  ])('accepts %s', (_name, value) => {
    expect(issues(value)).toStrictEqual([]);
  });

  test('autoApply needs a trigger event', () => {
    const autoApplyIssue = { message: message(RulesMessage.TriggerAutoApplyWithoutEvent) };

    expect(issues(action({ triggerEvent: undefined, autoApply: false }))).toStrictEqual([
      { path: ['data', 'autoApply'], ...autoApplyIssue },
    ]);
    expect(issues(effect({ triggerEvent: undefined, autoApply: false }))).toStrictEqual([
      { path: ['data', 'autoApply'], ...autoApplyIssue },
    ]);
  });

  test('autoApply is only ever false', () => {
    expect(found(action({ autoApply: true }))).toStrictEqual([`data.autoApply ${ValidationMessage.InvalidValue}`]);
  });

  test('checks the event and its predicate', () => {
    expect(found(action({ triggerEvent: { event: 'turn-middle' } }))).toStrictEqual([
      `data.triggerEvent.event ${ValidationMessage.InvalidValue}`,
    ]);
    expect(found(effect({ triggerEvent: { event: 'strike', predicate: ['Focus'] } }))).toStrictEqual([
      `data.triggerEvent.predicate.0 ${RulesMessage.RollOptionFormat}`,
    ]);
    expect(found(effect({ triggerEvent: { event: 'strike', when: 'always' } }))).toStrictEqual([
      `data.triggerEvent.when ${ValidationMessage.UnrecognizedKeys}`,
    ]);
  });
});
