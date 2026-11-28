import { describe, expect, test } from 'bun:test';

/** The files that make up the content model: what an entry, a stat block or a variant rule is, rules held as references. */
const ROOTS = [
  'content-entry.ts',
  'entry-envelope.ts',
  'variant-rule.ts',
  'creature.ts',
  'creature-stat-block.ts',
  'companion-stat-block.ts',
  'armor.ts',
  'weapon.ts',
  'ancestry.ts',
];

/** Where the content model may not reach: the rule elements, the typed overlay and the pack layer built on it. */
const FORBIDDEN = /^(?:rule-element|typed-|content-pack|content-registry|content-bundle)/u;

const IMPORT = /(?:from|import)[\s(]*['"]\.\/(?<name>[\w-]+)['"]/gu;

async function importsOf(file: string): Promise<readonly string[]> {
  const source = await Bun.file(`${import.meta.dir}/${file}`).text();

  return [...source.matchAll(IMPORT)].flatMap((match) => {
    const name = match.groups?.['name'];

    return name === undefined ? [] : [name];
  });
}

/** Adds every file reached from `files` by relative imports, type-only ones included, with the file that imports it. */
async function reach(files: readonly string[], reached: Map<string, string>): Promise<void> {
  const found = await Promise.all(files.map(async (file) => ({ file, imports: await importsOf(file) })));

  const next = found.flatMap(({ file, imports }) =>
    imports.flatMap((name) => {
      if (reached.has(name)) {
        return [];
      }

      reached.set(name, file);

      return [`${name}.ts`];
    }),
  );

  if (next.length > 0) {
    await reach(next, reached);
  }
}

/** The imports that cross out of the content model, each as `importer -> imported`. */
async function crossings(): Promise<readonly string[]> {
  const reached = new Map<string, string>();
  await reach(ROOTS, reached);

  return [...reached].flatMap(([name, from]) => (FORBIDDEN.test(name) ? [`${from} -> ${name}`] : []));
}

describe('the content model', () => {
  test('reaches no rule element, typed overlay or pack file', async () => {
    const crossed = await crossings();

    expect(crossed).toStrictEqual([]);
  });
});
