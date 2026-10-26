import { describe, expect, test } from 'bun:test';

import { fieldIssues, message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import { EnvironmentData } from './environment';
import { RulesMessage } from './messages';

function issues(value: unknown): readonly FieldIssue[] {
  const result = EnvironmentData.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const speech = { id: 'speech', reason: 'You cannot speak underwater.' };
const fireEffects = { id: 'fire-effects', reason: 'Fire is put out underwater.' };
const suffocation = { after: { count: 5, unit: 'round' }, applies: '3f2a6c1e-8d4b-5e7a-9c0b-1a2b3c4d5e6f' };

describe('EnvironmentData', () => {
  test('an environment with nothing to forbid or cost is valid', () => {
    expect(EnvironmentData.parse({})).toEqual({ restrictions: [], consequences: [] });
  });

  test('restrictions and consequences are kept as written', () => {
    const data = { restrictions: [speech, fireEffects], consequences: [{ ...suffocation, repeats: true }] };

    expect(EnvironmentData.parse(data)).toEqual(data);
  });

  test('a repeated restriction id is an error at the repeat', () => {
    const result = issues({ restrictions: [speech, fireEffects, { ...speech, reason: 'Again.' }] });

    expect(result).toEqual([
      { path: ['restrictions', 2, 'id'], message: message(RulesMessage.ListDuplicate, { value: 'speech' }) },
    ]);
  });

  test.each([
    ['an id that is not a slug', { restrictions: [{ id: 'No Speech', reason: 'Why.' }] }],
    ['a restriction with no reason', { restrictions: [{ id: 'speech' }] }],
    ['an empty reason', { restrictions: [{ id: 'speech', reason: '' }] }],
    ['a consequence after no time', { consequences: [{ ...suffocation, after: { count: 0, unit: 'round' } }] }],
    ['a consequence after an unknown unit', { consequences: [{ ...suffocation, after: { count: 1, unit: 'eon' } }] }],
    ['a consequence applying nothing', { consequences: [{ after: suffocation.after }] }],
    ['an unknown field', { restrictions: [], consequences: [], depth: 30 }],
  ])('rejects %s', (_name, data) => {
    expect(EnvironmentData.safeParse(data).success).toBe(false);
  });
});
