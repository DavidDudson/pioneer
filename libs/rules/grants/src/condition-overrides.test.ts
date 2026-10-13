import { describe, expect, test } from 'bun:test';

import { ContentKind } from '@pioneer/rules/sdk';

import type { GrantEntry } from './grant-entry';
import { resolveGrants } from './resolve-grants';
import { afflicted, entry, grantOf, idOf, inputsOf } from './testing/builders';

const condition = (slug: string, rules: readonly object[] = [], overrides: readonly string[] = []): GrantEntry => ({
  ...entry(slug, rules),
  kind: ContentKind.Condition,
  ...(overrides.length === 0 ? {} : { overrides: overrides.map((each) => idOf(each)) }),
});

const dazzled = condition('dazzled');
const blinded = condition('blinded', [], ['dazzled']);

/** The conditions in play once `entries` resolve from the conditions named in `roots`. */
function active(entries: readonly GrantEntry[], roots: readonly string[]): string[] {
  const result = resolveGrants(inputsOf({ entries, roots: roots.map((slug) => afflicted(slug)) }));
  return result.items.map(({ entry: each }) => String(each.slug)).toSorted();
}

describe('an overridden condition', () => {
  test('is suppressed while the condition that overrides it is on the character', () => {
    expect(active([dazzled, blinded], ['dazzled', 'blinded'])).toEqual(['blinded']);
  });

  test('applies again once the condition that overrides it ends', () => {
    expect(active([dazzled, blinded], ['dazzled'])).toEqual(['dazzled']);
  });

  test('is suppressed when the condition that overrides it is granted by another', () => {
    const content = [dazzled, blinded, condition('unconscious', [grantOf('blinded')])];
    expect(active(content, ['dazzled', 'unconscious'])).toEqual(['blinded', 'unconscious']);
  });

  test('stays when the overriding condition is on no one', () => {
    expect(active([dazzled, blinded], [])).toEqual([]);
  });
});
