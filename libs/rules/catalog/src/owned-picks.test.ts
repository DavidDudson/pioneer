import { describe, expect, test } from 'bun:test';

import { ContentEntryFile, RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

const PACKS = `${import.meta.dir}/../../../../content/packs`;
const MANIFEST = '/pack.json';
const PICKED = /picked:(?<flag>[a-z0-9-]+?)(?:-(?:attack|damage))?"/gu;

interface Dangling {
  readonly entry: string;
  readonly flag: string;
}

/** How many `ChoiceSet`s of the entry use each flag. */
function flagCounts(entry: ContentEntry): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const rule of entry.rules) {
    if (rule.key === RuleElementKey.ChoiceSet) {
      counts.set(String(rule.flag), (counts.get(String(rule.flag)) ?? 0) + 1);
    }
  }
  return counts;
}

/** The `picked:<flag>` reads of an entry's rules that no single `ChoiceSet` over owned items of that flag declares. */
function danglingIn(file: string, entry: ContentEntry): readonly Dangling[] {
  const counts = flagCounts(entry);
  const declared = new Set(
    entry.rules.flatMap((rule) =>
      rule.key === RuleElementKey.ChoiceSet &&
      !Array.isArray(rule.choices) &&
      'ownedKinds' in rule.choices &&
      counts.get(String(rule.flag)) === 1
        ? [String(rule.flag)]
        : [],
    ),
  );
  const reads = entry.rules.flatMap((rule) =>
    [...JSON.stringify(rule).matchAll(PICKED)].flatMap((match) => match.groups?.['flag'] ?? []),
  );
  return reads.filter((flag) => !declared.has(flag)).map((flag) => ({ entry: `${file}:${entry.slug}`, flag }));
}

/** Every committed pack file but the manifests. */
async function packFiles(): Promise<readonly string[]> {
  const files: string[] = [];
  for await (const file of new Bun.Glob('*/*.json').scan(PACKS)) {
    files.push(file);
  }
  return files.filter((file) => !file.endsWith(MANIFEST));
}

describe('picked:<flag> in the committed packs (ADR-0075)', () => {
  test('every read names the one ChoiceSet over owned items of that flag on the same entry', async () => {
    const files = await packFiles();
    const found = await Promise.all(
      files.map(async (file) => {
        const entries = ContentEntryFile.parse(await Bun.file(`${PACKS}/${file}`).json());
        return entries.flatMap((entry) => danglingIn(file, entry));
      }),
    );

    expect(found.flat()).toEqual([]);
  });
});
