import { describe, expect, test } from 'bun:test';

import { ConditionEffect, ConditionTrigger, ContentEntryFile, ContentKind, slugName } from '@pioneer/rules/sdk';
import type { ConditionEnding, ContentId } from '@pioneer/rules/sdk';

import { conditions } from './testing/condition-entries';

const actionFile = await import('@pioneer/content/packs/player-core/action.json');
const actions = ContentEntryFile.parse(actionFile.default).filter((each) => each.kind === ContentKind.Action);
const actionIds = new Set(actions.map((each) => each.id));

function endingsOf(slug: string): readonly ConditionEnding[] {
  return conditions.find((each) => slugName(each.slug) === slug)?.data.recovery ?? [];
}

function actionId(slug: string): ContentId | undefined {
  return actions.find((each) => each.slug === `action:${slug}`)?.id;
}

/** What each automatic ending of `slug` does, and when. */
function automaticOf(slug: string): readonly object[] {
  return endingsOf(slug).flatMap((ending) =>
    ending.kind === 'automatic' ? [{ trigger: ending.trigger, change: ending.change }] : [],
  );
}

function checksOf(slug: string): readonly object[] {
  return endingsOf(slug).flatMap((ending) => (ending.kind === 'check' ? [ending.check] : []));
}

/** The action entries the endings of `slug` link. */
function actionsOf(slug: string): readonly (ContentId | undefined)[] {
  return endingsOf(slug).flatMap((ending) => (ending.kind === 'action' ? [ending.action] : []));
}

const LINKED = conditions.flatMap((each) => actionsOf(slugName(each.slug)));
const isLinked = (value: ContentId | undefined): value is ContentId => value !== undefined;

describe('how Player Core conditions end', () => {
  test('every condition has at least one ending, or says only its source ends it', () => {
    expect(conditions.filter((each) => each.data.recovery.length === 0).map((each) => each.slug)).toEqual([]);
  });

  test('every ending carries rule text', () => {
    expect(
      conditions.filter((each) => each.data.recovery.some(({ text }) => text.length === 0)).map((each) => each.slug),
    ).toEqual([]);
  });

  test('every action an ending links is a Player Core action', () => {
    const linked = LINKED.filter((id) => isLinked(id));

    expect(linked.length).toBeGreaterThan(0);
    expect(linked.filter((id) => !actionIds.has(id))).toEqual([]);
  });

  test.each([
    ['fatigued', ConditionTrigger.Rest, ConditionEffect.Remove],
    ['drained', ConditionTrigger.Rest, ConditionEffect.Lower],
    ['doomed', ConditionTrigger.Rest, ConditionEffect.Lower],
    ['frightened', ConditionTrigger.TurnEnd, ConditionEffect.Lower],
  ])('%s eases automatically at %s: %s', (slug, trigger, effect) => {
    expect(automaticOf(slug)).toEqual([{ trigger, change: { effect } }]);
  });

  test('the recovery check for dying is flat against 10 plus its value', () => {
    expect(checksOf('dying')).toEqual([{ against: [], dc: '10 + @value' }]);
  });

  test('persistent damage is a flat check against 15, 10 when assisted', () => {
    expect(checksOf('persistent-damage')).toEqual([{ against: [], dc: '15', assistedDc: '10' }]);
  });

  test.each([
    ['prone', 'stand'],
    ['grabbed', 'escape'],
    ['restrained', 'escape'],
    ['immobilized', 'escape'],
    ['hidden', 'seek'],
    ['undetected', 'seek'],
    ['wounded', 'treat-wounds'],
    ['dying', 'administer-first-aid'],
  ])('%s is ended by the %s action', (slug, action) => {
    expect(actionsOf(slug)).toContain(actionId(action));
  });
});
