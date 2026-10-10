import { describe, expect, test } from 'bun:test';

import { SummaryKind } from '@pioneer/rules/predicate';
import { ContentText, Origin, OriginHop, Predicate, RuleSlug } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { GrantEntry, GrantRoot } from './grant-entry';
import { GrantsMessage } from './messages';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { entry, grantOf, idOf, inputsOf, picked } from './testing/builders';

function resolve(entries: readonly GrantEntry[], roots: readonly GrantRoot[], level = 1): GrantResolution {
  return resolveGrants(inputsOf({ entries, roots, level }));
}

/** The player picked it for `slot`. */
const chosen = (slot: string): OriginHop => OriginHop.parse({ kind: 'choice', slot });

/** Rule `rule` of the test entry `by` granted it. */
const granted = (by: string, rule: number): OriginHop => OriginHop.parse({ kind: 'grant', by: idOf(by), rule });

/** A chain of `length` entries, each granting the next. */
function chainOf(length: number): GrantEntry[] {
  const slugs = Array.from({ length }, (_value, index) => `link-${index}`);
  return slugs.map((slug, index) =>
    entry(
      slug,
      slugs.slice(index + 1, index + 2).map((next) => grantOf(next)),
    ),
  );
}

const names = (items: readonly { readonly entry: GrantEntry }[]): string[] => items.map((item) => item.entry.name);

/** A fighter: Shield Block feature granting the Shield Block action, and Attack of Opportunity. */
const fighterContent = [
  entry('fighter', [grantOf('shield-block-feature'), grantOf('attack-of-opportunity')]),
  entry('shield-block-feature', [grantOf('shield-block')]),
  entry('shield-block'),
  entry('attack-of-opportunity'),
];

describe('resolveGrants', () => {
  test('follows grants depth first, each item with the hops that put it there', () => {
    const result = resolve(fighterContent, [picked('fighter', 'class')]);
    expect(names(result.items)).toEqual(['fighter', 'shield-block-feature', 'shield-block', 'attack-of-opportunity']);
    expect(result.errors).toEqual([]);
    const action = result.items.at(2);
    expect(action?.origin).toEqual(
      Origin.parse({
        hops: [chosen('class'), granted('fighter', 0), granted('shield-block-feature', 0)],
        entry: idOf('shield-block'),
        sources: [{ kind: 'book', book: 'player-core', page: 1 }],
      }),
    );
  });

  test('records the rule index of the granting element', () => {
    const result = resolve(fighterContent, [picked('fighter', 'class')]);
    expect(result.items[3]?.origin.hops.at(-1)).toEqual(granted('fighter', 1));
  });

  test('carries the flag the grant names its entry by', () => {
    const content = [entry('fighter', [{ ...grantOf('shield-block'), flag: 'block' }]), entry('shield-block')];
    expect(resolve(content, [picked('fighter')]).items[1]?.flag).toBe(RuleSlug.parse('block'));
  });

  test('skips a second grant of an entry already on the character, and reports it', () => {
    const content = [
      entry('fighter', [grantOf('shield-block')]),
      entry('general-feat', [grantOf('shield-block')]),
      entry('shield-block'),
    ];
    const result = resolve(content, [picked('fighter'), picked('general-feat')]);
    expect(names(result.items).filter((name) => name === 'shield-block')).toHaveLength(1);
    expect(names(result.duplicates)).toEqual(['shield-block']);
    expect(result.errors).toEqual([]);
  });

  test('grants an entry again when the grant allows duplicates', () => {
    const content = [
      entry('fighter', [grantOf('shield-block'), { ...grantOf('shield-block'), allowDuplicate: true }]),
      entry('shield-block'),
    ];
    const result = resolve(content, [picked('fighter')]);
    expect(names(result.items)).toEqual(['fighter', 'shield-block', 'shield-block']);
    expect(result.duplicates).toEqual([]);
  });

  test('reports a cycle naming every entry on it, and still resolves the rest', () => {
    const content = [
      entry('alpha', [grantOf('beta'), grantOf('gamma')]),
      entry('beta', [grantOf('alpha')]),
      entry('gamma'),
    ];
    const result = resolve(content, [picked('alpha')]);
    expect(names(result.items)).toEqual(['alpha', 'beta', 'gamma']);
    expect(result.errors.map((failure) => failure.error)).toEqual([
      message(GrantsMessage.Cycle, { entries: 'alpha, beta', count: 2 }),
    ]);
    expect(result.errors[0]?.hops.at(-1)).toEqual(granted('beta', 0));
  });

  test('reports an entry that grants itself', () => {
    const result = resolve([entry('alpha', [grantOf('alpha')])], [picked('alpha')]);
    expect(result.errors.map((failure) => failure.error)).toEqual([
      message(GrantsMessage.Cycle, { entries: 'alpha', count: 1 }),
    ]);
  });

  test('reports a grant of a missing entry at its element, and resolves the others', () => {
    const content = [entry('fighter', [grantOf('missing'), grantOf('shield-block')]), entry('shield-block')];
    const result = resolve(content, [picked('fighter')]);
    expect(names(result.items)).toEqual(['fighter', 'shield-block']);
    expect(result.errors).toEqual([
      {
        error: message(GrantsMessage.UnknownEntry, { entry: idOf('missing') }),
        hops: [chosen('fighter'), granted('fighter', 0)],
      },
    ]);
  });

  test('reports a missing root at its own hop', () => {
    const result = resolve([], [picked('missing', 'class')]);
    expect(result.items).toEqual([]);
    expect(result.errors).toEqual([
      { error: message(GrantsMessage.UnknownEntry, { entry: idOf('missing') }), hops: [chosen('class')] },
    ]);
  });

  test('follows a grant whose predicate holds and drops one whose predicate fails', () => {
    const content = [
      entry('fighter', [
        { ...grantOf('weapon-mastery'), predicate: [{ gte: ['self:level', 5] }] },
        { ...grantOf('battlefield-surveyor'), predicate: [{ gte: ['self:level', 7] }] },
      ]),
      entry('weapon-mastery'),
      entry('battlefield-surveyor'),
    ];
    const result = resolve(content, [picked('fighter')], 5);
    expect(names(result.items)).toEqual(['fighter', 'weapon-mastery']);
    expect(result.conditional).toEqual([]);
  });

  test('reports a grant whose predicate is unknown as conditional, and does not follow it', () => {
    const content = [
      entry('ranger', [{ ...grantOf('forest-stride'), predicate: ['terrain:forest'] }]),
      entry('forest-stride', [grantOf('trackless-step')]),
      entry('trackless-step'),
    ];
    const result = resolve(content, [picked('ranger')]);
    expect(names(result.items)).toEqual(['ranger']);
    expect(names(result.conditional)).toEqual(['forest-stride']);
    expect(result.conditional[0]?.predicate).toEqual(Predicate.parse(['terrain:forest']));
    expect(result.conditional[0]?.summary.kind).toBe(SummaryKind.Phrase);
    expect(result.conditional[0]?.origin.hops.at(-1)).toEqual(granted('ranger', 0));
  });

  test('uses an authored summary for a conditional grant', () => {
    const content = [
      entry('ranger', [
        { ...grantOf('forest-stride'), predicate: ['terrain:forest'], display: { summary: 'in a forest' } },
      ]),
      entry('forest-stride'),
    ];
    const summary = resolve(content, [picked('ranger')]).conditional[0]?.summary;
    expect(summary).toEqual({ kind: SummaryKind.Authored, text: ContentText.parse('in a forest') });
  });

  test('stops a chain longer than an origin records', () => {
    const LENGTH = 70;
    const result = resolve(chainOf(LENGTH), [picked('link-0')]);
    expect(result.errors.map((failure) => failure.error)).toEqual([message(GrantsMessage.TooDeep, { maximum: 64 })]);
    expect(result.items.every((item) => item.origin.hops.length <= 64)).toBe(true);
  });
});
