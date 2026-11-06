import { describe, expect, test } from 'bun:test';

import { deriveStatistics, factsUnderForm } from '@pioneer/rules/engine';
import type { RuleInPlay } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import { inputsOf } from '@pioneer/rules/grants/testing';
import { OriginHopKind, RuleIndex } from '@pioneer/rules/sdk';
import type { ContentId, Origin } from '@pioneer/rules/sdk';

import { conditionGrantEntries as entries, idNamed } from './testing/condition-entries';
import { core, fighter, noFacts } from './testing/core-rules';

/** The rules of the conditions in play once `root` is put on the character, as the sheet derives from them. */
function rulesUnder(root: ContentId): readonly RuleInPlay[] {
  const { items } = resolveGrants(
    inputsOf({ entries, roots: [{ entry: root, hop: { kind: 'condition', condition: root } }] }),
  );
  return items.flatMap(({ entry, origin }) =>
    entry.rules.map((element, rule) => ({ element, origin, rule: RuleIndex.parse(rule) })),
  );
}

/** The origin of every applied breakdown line, across every statistic the fighter has, with `root` put on them. */
function appliedOrigins(root: ContentId): readonly Origin[] {
  const rules = rulesUnder(root);
  const results = deriveStatistics(core, fighter, { rules, facts: factsUnderForm({ rules, facts: noFacts() }) });
  return [...results.values()].flatMap((result) =>
    result.ok ? result.lines.map(({ modifier }) => modifier.origin) : [],
  );
}

/**
 * For each implying condition, the conditions it brings that change a statistic the fighter has. Immobilized, which
 * grabbed and restrained also bring, changes none.
 */
const WITH_LINES: readonly (readonly [string, string])[] = [
  ['confused', 'off-guard'],
  ['encumbered', 'clumsy'],
  ['grabbed', 'off-guard'],
  ['paralyzed', 'off-guard'],
  ['prone', 'off-guard'],
  ['restrained', 'off-guard'],
  ['unconscious', 'off-guard'],
  ['unconscious', 'blinded'],
];

describe('an implied condition in a statistic breakdown', () => {
  test.each(WITH_LINES)('%s brings %s as lines whose last origin hop names it', (parent, implied) => {
    const parentId = idNamed(parent);
    const hops = appliedOrigins(parentId)
      .filter(({ entry }) => entry === idNamed(implied))
      .map(({ hops: each }) => each.at(-1));

    expect(hops.length).toBeGreaterThan(0);
    expect(hops).toMatchObject(hops.map(() => ({ kind: OriginHopKind.Grant, by: parentId })));
  });

  test('a condition that implies nothing brings no off-guard line', () => {
    const origins = appliedOrigins(idNamed('dazzled'));

    expect(origins.length).toBeGreaterThan(0);
    expect(origins.some(({ entry }) => entry === idNamed('off-guard'))).toBe(false);
  });
});
