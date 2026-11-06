import { describe, expect, test } from 'bun:test';

import { resolveGrants } from '@pioneer/rules/grants';
import type { GrantedItem, GrantEntry } from '@pioneer/rules/grants';
import { inputsOf } from '@pioneer/rules/grants/testing';
import {
  ConditionValue,
  ContentEntryFile,
  ContentKind,
  OriginHopKind,
  RuleElementKey,
  slugName,
} from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId } from '@pioneer/rules/sdk';
import { assert, property, shuffledSubarray } from 'fast-check';

const file = await import('@pioneer/content/packs/player-core/condition.json');
type ConditionEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Condition }>;
const conditions: readonly ConditionEntry[] = ContentEntryFile.parse(file.default).filter(
  (each): each is ConditionEntry => each.kind === ContentKind.Condition,
);

/** The sources of `entry`, of which an entry has at least one. */
function sourcesOf({ sources, slug }: ConditionEntry): GrantEntry['sources'] {
  const [first, ...rest] = sources;
  if (first === undefined) {
    throw new Error(`${slug} has no source`);
  }
  return [first, ...rest];
}

/** Every Player Core condition as grant resolution reads it. */
const entries: readonly GrantEntry[] = conditions.map((each) => ({
  id: each.id,
  kind: each.kind,
  slug: slugName(each.slug),
  name: each.name,
  rules: each.rules,
  sources: sourcesOf(each),
  rollOptions: [],
  valued: each.data.valued,
  overrides: each.data.overrides,
}));

const nameOf = new Map(conditions.map((each) => [each.id, String(slugName(each.slug))]));
const named = (id: ContentId): string => nameOf.get(id) ?? id;
const idNamed = (name: string): ContentId => {
  const found = conditions.find((each) => slugName(each.slug) === name);
  if (found === undefined) {
    throw new Error(`no Player Core condition ${name}`);
  }
  return found.id;
};

/** The conditions in play when the character is put under `roots`, each with the items that brought it. */
function resolved(roots: readonly ContentId[]): readonly GrantedItem[] {
  const result = resolveGrants(
    inputsOf({
      entries,
      roots: roots.map((condition) => ({ entry: condition, hop: { kind: 'condition', condition } })),
    }),
  );
  return result.items;
}

const inPlay = (roots: readonly ContentId[]): string[] =>
  resolved(roots)
    .map(({ entry }) => String(entry.slug))
    .toSorted();

/** The conditions a condition's `GrantItem` rules give. */
function grantedBy(each: ConditionEntry): ContentId[] {
  return each.rules.flatMap((rule) =>
    rule.key === RuleElementKey.GrantItem && typeof rule.item === 'string' ? [rule.item] : [],
  );
}

const IMPLYING = conditions.filter((each) => each.data.implies.length > 0);

/** The names of what each implying condition implies, by its name. */
const IMPLIED_NAMES = Object.fromEntries(
  IMPLYING.map((each) => [String(slugName(each.slug)), each.data.implies.map((id) => named(id)).toSorted()]),
);

/** The conditions whose `implies` and `GrantItem` rules name different conditions. */
const DRIFT = conditions
  .filter((each) => JSON.stringify([...each.data.implies].toSorted()) !== JSON.stringify(grantedBy(each).toSorted()))
  .map((each) => String(slugName(each.slug)));

describe('the conditions a condition implies', () => {
  test('are the conditions its rules grant, in both directions', () => {
    expect(DRIFT).toEqual([]);
  });

  test('are the ones Player Core names', () => {
    expect(IMPLIED_NAMES).toEqual({
      confused: ['off-guard'],
      dying: ['unconscious'],
      encumbered: ['clumsy'],
      grabbed: ['immobilized', 'off-guard'],
      paralyzed: ['off-guard'],
      prone: ['off-guard'],
      restrained: ['immobilized', 'off-guard'],
      unconscious: ['blinded', 'off-guard'],
    });
  });

  test.each(IMPLYING.map((each) => [String(slugName(each.slug)), each] as const))(
    '%s brings each of them into play, with its origin naming %s',
    (_name, parent) => {
      const items = resolved([parent.id]);
      for (const impliedId of parent.data.implies) {
        const item = items.find(({ entry }) => entry.id === impliedId);
        expect(item?.entry.id).toBe(impliedId);
        expect(item?.origin.hops.at(-1)).toMatchObject({ kind: OriginHopKind.Grant, by: parent.id });
      }
    },
  );

  test('encumbered brings clumsy at 1', () => {
    expect(resolved([idNamed('encumbered')]).find(({ entry }) => String(entry.slug) === 'clumsy')?.value).toBe(
      ConditionValue.parse(1),
    );
  });

  test('chain: dying brings unconscious, which brings blinded and off-guard', () => {
    expect(inPlay([idNamed('dying')])).toEqual(['blinded', 'dying', 'off-guard', 'unconscious']);
  });
});

describe('removing the condition that implied others', () => {
  test.each(IMPLYING.map((each) => [String(slugName(each.slug)), each] as const))(
    '%s leaves nothing it alone brought',
    (_name, parent) => {
      expect(inPlay([])).toEqual([]);
      expect(inPlay([parent.id]).length).toBeGreaterThan(1);
    },
  );

  test('an implied condition another source also grants stays', () => {
    expect(inPlay([idNamed('prone'), idNamed('paralyzed')])).toEqual(['off-guard', 'paralyzed', 'prone']);
    expect(inPlay([idNamed('prone')])).toEqual(['off-guard', 'prone']);
  });
});

describe('an overridden condition', () => {
  test('is hidden while its overrider is in play, and returns when it goes', () => {
    expect(inPlay([idNamed('dazzled'), idNamed('blinded')])).toEqual(['blinded']);
    expect(inPlay([idNamed('dazzled')])).toEqual(['dazzled']);
  });

  test('is hidden by an overrider that was implied, not chosen', () => {
    expect(inPlay([idNamed('dazzled'), idNamed('unconscious')])).toEqual(['blinded', 'off-guard', 'unconscious']);
  });

  test('restrained replaces grabbed', () => {
    expect(inPlay([idNamed('grabbed'), idNamed('restrained')])).toEqual(['immobilized', 'off-guard', 'restrained']);
  });
});

/** The conditions that end up on the character: `roots` and all they imply, less what another overrides. */
function closure(roots: readonly ContentId[]): string[] {
  const byId = new Map(conditions.map((each) => [each.id, each]));
  const reached = new Set<ContentId>(roots);
  for (const id of reached) {
    for (const implied of byId.get(id)?.data.implies ?? []) {
      reached.add(implied);
    }
  }
  const overridden = new Set([...reached].flatMap((id) => byId.get(id)?.data.overrides ?? []));
  return [...reached]
    .filter((id) => !overridden.has(id))
    .map((id) => named(id))
    .toSorted();
}

describe('conditions together', () => {
  test('for any set of conditions, those in play are the closure over implies less overrides', () => {
    const ids = conditions.map((each) => each.id);
    assert(
      property(shuffledSubarray(ids), (roots) => {
        expect(inPlay(roots)).toEqual(closure(roots));
      }),
    );
  });
});
