import { describe, expect, test } from 'bun:test';

import { deriveStatistics, factsUnderForm } from '@pioneer/rules/engine';
import type { RuleInPlay } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import type { GrantEntry } from '@pioneer/rules/grants';
import { inputsOf } from '@pioneer/rules/grants/testing';
import { ContentEntryFile, ContentKind, OriginHopKind, RuleIndex, Selector, slugName } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { core, fighter, noFacts } from './testing/core-rules';

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

function idNamed(name: string): GrantEntry['id'] {
  const found = entries.find((each) => String(each.slug) === name);
  if (found === undefined) {
    throw new Error(`no Player Core condition ${name}`);
  }
  return found.id;
}

/** The rules of the conditions in play once `root` is put on the character, as the sheet derives from them. */
function rulesUnder(root: string): readonly RuleInPlay[] {
  const condition = idNamed(root);
  const { items } = resolveGrants(
    inputsOf({ entries, roots: [{ entry: condition, hop: { kind: 'condition', condition } }] }),
  );
  return items.flatMap(({ entry, origin }) =>
    entry.rules.map((element, rule) => ({ element, origin, rule: RuleIndex.parse(rule) })),
  );
}

/** What the test reads of an AC breakdown line: the entry it comes from, that entry's last origin hop, its status. */
interface AcLine {
  readonly name: string;
  readonly last: unknown;
  readonly status: string;
}

function acLines(root: string): readonly AcLine[] {
  const rules = rulesUnder(root);
  const result = deriveStatistics(core, fighter, { rules, facts: factsUnderForm({ rules, facts: noFacts() }) }).get(
    Selector.parse('ac'),
  );
  return result?.ok === true
    ? result.lines.map(({ modifier, status }) => ({
        name: String(modifier.origin.entry),
        last: modifier.origin.hops.at(-1),
        status: status.kind,
      }))
    : [];
}

describe('an implied condition in a statistic breakdown', () => {
  test('off-guard, brought by unconscious, shows as an applied AC line with its origin chain', () => {
    const offGuard = idNamed('off-guard');
    const line = acLines('unconscious').find(({ name }) => name === String(offGuard));

    expect(line).toMatchObject({ status: 'applied', last: { kind: OriginHopKind.Grant, by: idNamed('unconscious') } });
  });

  test('a condition that implies nothing shows no off-guard line', () => {
    expect(acLines('dazzled').find(({ name }) => name === String(idNamed('off-guard')))).toBeUndefined();
  });
});
