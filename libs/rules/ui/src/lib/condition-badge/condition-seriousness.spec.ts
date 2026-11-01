import { array, assert, constantFrom, oneof, property, string } from 'fast-check';
import { describe, expect, it } from 'vitest';

import { bySeriousness, CONDITIONS_BY_SERIOUSNESS, ConditionSlug } from './condition-seriousness';

const knownSlug = constantFrom(...CONDITIONS_BY_SERIOUSNESS);
const knownSlugs: readonly string[] = CONDITIONS_BY_SERIOUSNESS;
const anySlug = oneof(knownSlug, string({ minLength: 1, maxLength: 6 }));

const isUnknown = (slug: string): boolean => !knownSlugs.includes(slug);
const rank = (slug: ConditionSlug): number => CONDITIONS_BY_SERIOUSNESS.indexOf(slug);

describe(bySeriousness, () => {
  it('puts dying, doomed and wounded first', () => {
    expect(
      bySeriousness([ConditionSlug.Prone, ConditionSlug.Wounded, ConditionSlug.Dying, ConditionSlug.Doomed]).slice(
        0,
        3,
      ),
    ).toStrictEqual([ConditionSlug.Dying, ConditionSlug.Doomed, ConditionSlug.Wounded]);
  });

  it('puts unknown slugs after the known ones, in input order', () => {
    expect(bySeriousness(['zz-homebrew', ConditionSlug.Observed, 'aa-homebrew'])).toStrictEqual([
      ConditionSlug.Observed,
      'zz-homebrew',
      'aa-homebrew',
    ]);
  });

  it('lists every condition exactly once', () => {
    expect(new Set(CONDITIONS_BY_SERIOUSNESS).size).toBe(CONDITIONS_BY_SERIOUSNESS.length);
  });

  it('keeps every input, only reordered', () => {
    assert(
      property(array(anySlug), (slugs) => {
        expect(bySeriousness(slugs).toSorted()).toStrictEqual(slugs.toSorted());
      }),
    );
  });

  it('is idempotent: ordering twice changes nothing', () => {
    assert(
      property(array(anySlug), (slugs) => {
        const once = bySeriousness(slugs);
        expect(bySeriousness(once)).toStrictEqual(once);
      }),
    );
  });

  it('is stable: unknown slugs keep their input order', () => {
    assert(
      property(array(anySlug), (slugs) => {
        expect(bySeriousness(slugs).filter((slug) => isUnknown(slug))).toStrictEqual(
          slugs.filter((slug) => isUnknown(slug)),
        );
      }),
    );
  });

  it('ranks the tiers in order: dying group, then incapacitating, then hindering', () => {
    expect(rank(ConditionSlug.Wounded)).toBeLessThan(rank(ConditionSlug.Unconscious));
    expect(rank(ConditionSlug.Petrified)).toBeLessThan(rank(ConditionSlug.Stunned));
    expect(rank(ConditionSlug.Fleeing)).toBeLessThan(rank(ConditionSlug.Blinded));
    expect(rank(ConditionSlug.Broken)).toBeLessThan(rank(ConditionSlug.Observed));
  });

  it('ranks every remaster condition', () => {
    expect(CONDITIONS_BY_SERIOUSNESS.toSorted()).toStrictEqual(Object.values(ConditionSlug).toSorted());
  });

  it('never ranks a later condition above an earlier one', () => {
    assert(
      property(array(knownSlug), (slugs) => {
        const ordered = bySeriousness(slugs);
        const ranks = ordered.map((slug) => knownSlugs.indexOf(slug));
        expect(ranks).toStrictEqual(ranks.toSorted((first, second) => first - second));
      }),
    );
  });

  it('does not change its input', () => {
    const input = [ConditionSlug.Prone, ConditionSlug.Dying];
    bySeriousness(input);
    expect(input).toStrictEqual([ConditionSlug.Prone, ConditionSlug.Dying]);
  });
});
