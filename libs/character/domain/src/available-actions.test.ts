import { describe, expect, test } from 'bun:test';

import { ActionOriginKind, ActionStatus } from '@pioneer/rules/engine';
import type { AvailableAction } from '@pioneer/rules/engine';
import { ContentId, ContentKind, ContentRegistry, NamespaceKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, installRulesFakes } from '@pioneer/rules/sdk/testing';

import { characterActions } from './available-actions';
import type { CharacterDocument } from './character-document';
import { characterStatisticInputs } from './character-statistics';
import { ConditionInstanceId } from './conditions';
import { FRESH_PLAY } from './play-state';
import { slotContent } from './slot-offer';
import { CharacterBuilder } from './testing';

installRulesFakes();

const PACK = 'action-fixtures';
const NO_SPENT = { uses: {} };
const INSTANCE = ConditionInstanceId.parse('00000000-0000-4000-8000-000000000001');

const builder = new ContentPackBuilder().withId(PACK);
builder.withItem(ContentKind.Action, 'stride', { cost: 'one', universal: true });
builder.withItem(ContentKind.Action, 'climb', { cost: 'one', universal: true, skills: ['skill:athletics'] });
builder.withItem(ContentKind.Action, 'pick-a-lock', {
  cost: 'two',
  universal: true,
  skills: ['skill:thievery'],
  minimumProficiency: 'trained',
});
builder.withItem(ContentKind.Action, 'stand', { cost: 'one', universal: true, requirements: ['self:condition:prone'] });
builder.withItem(ContentKind.Action, 'sneak-attack', { cost: 'free' });
builder.withItem(ContentKind.Action, 'escape', { cost: 'one' });
builder.withCondition('prone');
builder.withCondition('grabbed', [{ key: 'GrantItem', item: builder.idOf(ContentKind.Action, 'escape') }]);
builder.withItem(ContentKind.Action, 'spin-web', { cost: 'two' });
builder.withCondition('spidery', [
  { key: 'BattleForm', form: { actions: [{ action: builder.idOf(ContentKind.Action, 'spin-web') }] } },
]);
builder.withNamespace('self', NamespaceKind.Known);
const registry = new ContentRegistry();
registry.register(builder.build());

const prone = ContentId.parse(builder.idOf(ContentKind.Condition, 'prone'));
const grabbed = ContentId.parse(builder.idOf(ContentKind.Condition, 'grabbed'));
const spidery = ContentId.parse(builder.idOf(ContentKind.Condition, 'spidery'));
const id = (name: string): ContentId => ContentId.parse(builder.idOf(ContentKind.Action, name));

function actionsOf(document: CharacterDocument): readonly AvailableAction[] {
  const slots = slotContent(registry);
  return characterActions(
    document,
    { registry, slots, inputs: characterStatisticInputs(registry, document, slots), variants: [] },
    NO_SPENT,
  );
}

function find(actions: readonly AvailableAction[], name: string): AvailableAction | undefined {
  return actions.find(({ action }) => action === id(name));
}

const standing = new CharacterBuilder().build().document;
const lying: CharacterDocument = {
  ...standing,
  play: { ...FRESH_PLAY, conditions: [{ id: INSTANCE, condition: prone, duration: { kind: 'unlimited' } }] },
};

describe('characterActions', () => {
  test('every character has the universal actions, basic ones and skill ones apart', () => {
    const actions = actionsOf(standing);

    expect(find(actions, 'stride')?.origin).toStrictEqual({ kind: ActionOriginKind.Basic });
    expect(find(actions, 'climb')?.origin).toStrictEqual({ kind: ActionOriginKind.Skill });
  });

  test('an action nobody grants is not on the list', () => {
    expect(find(actionsOf(standing), 'sneak-attack')).toBeUndefined();
  });

  test('a trained-only skill action is unavailable to an untrained character', () => {
    const lock = find(actionsOf(standing), 'pick-a-lock');

    expect(lock?.status).toBe(ActionStatus.Unavailable);
  });

  test('an action that needs a condition is unavailable until the character has it', () => {
    expect(find(actionsOf(standing), 'stand')?.status).toBe(ActionStatus.Unavailable);
    expect(find(actionsOf(lying), 'stand')?.status).toBe(ActionStatus.Available);
  });
});

describe('characterActions granted by a condition', () => {
  const grabbedDocument: CharacterDocument = {
    ...standing,
    play: { ...FRESH_PLAY, conditions: [{ id: INSTANCE, condition: grabbed, duration: { kind: 'unlimited' } }] },
  };

  test('an action only a condition grants appears while the character has it, with the condition as its origin', () => {
    const escape = find(actionsOf(grabbedDocument), 'escape');

    expect(escape?.status).toBe(ActionStatus.Available);
    expect(escape?.origin.kind).toBe(ActionOriginKind.Granted);
  });

  test('it is not on the list once the condition is gone', () => {
    expect(find(actionsOf(standing), 'escape')).toBeUndefined();
  });
});

describe('characterActions granted by a battle form', () => {
  const spiderDocument: CharacterDocument = {
    ...standing,
    play: { ...FRESH_PLAY, conditions: [{ id: INSTANCE, condition: spidery, duration: { kind: 'unlimited' } }] },
  };

  test('an action the form grants appears while the form holds, with the form as its origin', () => {
    const web = find(actionsOf(spiderDocument), 'spin-web');

    expect(web?.origin.kind).toBe(ActionOriginKind.Granted);
  });

  test('it is not on the list once the form is gone', () => {
    expect(find(actionsOf(standing), 'spin-web')).toBeUndefined();
  });
});
