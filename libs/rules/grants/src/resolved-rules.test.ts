import { describe, expect, test } from 'bun:test';

import { RuleIndex } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';

import type { GrantEntry } from './grant-entry';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { resolvedRules } from './resolved-rules';
import { entry, inputsOf, picked, picksOf, slotOf } from './testing/builders';

const SKILL = slotOf('skill-training', 0);

const skillTraining = entry('skill-training', [
  {
    key: 'ChoiceSet',
    flag: 'skill',
    choices: [
      { value: 'athletics', label: 'Athletics' },
      { value: 'acrobatics', label: 'Acrobatics' },
    ],
  },
  {
    key: 'Proficiency',
    selector: { choice: 'skill', prefix: 'skill' },
    rank: 'trained',
  },
  { key: 'Proficiency', selector: 'perception', rank: 'expert' },
]);

function resolve(entries: readonly GrantEntry[], picks: readonly (readonly [SlotKey, string])[] = []): GrantResolution {
  return resolveGrants(
    inputsOf({
      entries,
      roots: [picked('skill-training')],
      picks: picksOf(picks),
    }),
  );
}

function selectorsOf(picks: readonly (readonly [SlotKey, string])[]): unknown[] {
  return resolvedRules(resolve([skillTraining], picks)).flatMap(({ element }) =>
    element.key === 'Proficiency' ? [element.selector] : [],
  );
}

describe('resolvedRules', () => {
  test('replaces a choice-driven selector with the prefix and the pick', () => {
    expect(selectorsOf([[SKILL, 'athletics']])).toEqual(['skill:athletics', 'perception']);
  });

  test('leaves out a choice-driven selector whose pick is still to make', () => {
    expect(selectorsOf([])).toEqual(['perception']);
  });

  test('keeps each element at its place in the entry, whatever is left out', () => {
    expect(resolvedRules(resolve([skillTraining])).map(({ rule }) => rule)).toEqual([
      RuleIndex.parse(0),
      RuleIndex.parse(2),
    ]);
  });
});
