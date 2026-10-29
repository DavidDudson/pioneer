/**
 * Maps actions AoN has no row for to the AoN page of the feat, heritage or background that grants them (Epic 9.5): AoN
 * prints the action inside that page. Reads every pack's entries and mappings, finds each action's `GrantItem` granters
 * and adds the granter's `{ book, aon, page }` to the action's pack file when exactly one page qualifies. Entries
 * already there keep their place and key order. It reports the rest and never guesses.
 */
import path from 'node:path';

import { proposeGrantedActions } from '@pioneer/rules/catalog';
import type { ActionGranter } from '@pioneer/rules/catalog';
import { ContentEntryFile, ContentKind, EnrichmentMappingFile } from '@pioneer/rules/sdk';
import type { ContentEntry, EnrichmentMapping, EntrySlug } from '@pioneer/rules/sdk';
import { Glob } from 'bun';
import * as z from 'zod';

const ROOT = path.join(import.meta.dir, '..');
const PACKS = path.join(ROOT, 'content', 'packs');
const ENRICHMENT = path.join(ROOT, 'content', 'enrichment');
const JSON_INDENT = 2;
const JsonArray = z.array(z.unknown()).readonly();
const GrantItemRule = z.object({ key: z.literal('GrantItem'), item: z.string() });

async function readEntries(pack: string): Promise<readonly ContentEntry[]> {
  const paths = await Array.fromAsync(new Glob('*.json').scan({ cwd: path.join(PACKS, pack), absolute: true }));
  const files = await Promise.all(
    paths
      .filter((file) => path.basename(file) !== 'pack.json')
      .map(async (file) => Bun.file(file).json() as Promise<unknown>),
  );
  return files.flatMap((json) => ContentEntryFile.parse(JsonArray.parse(json)));
}

/** Every `GrantItem` target inside a rule list, however deep (a choice set nests its grants). */
function grantedIds(node: unknown): readonly string[] {
  if (Array.isArray(node)) {
    return node.flatMap((child: unknown) => grantedIds(child));
  }
  if (typeof node === 'object' && node !== null) {
    const grant = GrantItemRule.safeParse(node);
    return [
      ...(grant.success ? [grant.data.item] : []),
      ...Object.values(node).flatMap((child: unknown) => grantedIds(child)),
    ];
  }
  return [];
}

/** A pack's enrichment file, as written (to merge into) and as parsed (to read). */
interface PackMapping {
  readonly written: Record<string, unknown>;
  readonly mapping: Record<string, EnrichmentMapping>;
}

async function readMapping(pack: string): Promise<PackMapping> {
  const file = Bun.file(path.join(ENRICHMENT, `${pack}.json`));
  const exists = await file.exists();
  const json: unknown = exists ? await file.json() : {};
  return { written: z.record(z.string(), z.unknown()).parse(json), mapping: EnrichmentMappingFile.parse(json) };
}

const packFiles = await Array.fromAsync(new Glob('*/pack.json').scan({ cwd: PACKS }));
const packNames = packFiles.map((file) => path.dirname(file));
const packs = await Promise.all(
  packNames.map(async (name) => {
    const { written, mapping } = await readMapping(name);
    return { name, entries: await readEntries(name), written, mapping };
  }),
);

/** Entry id to every distinct entry (with its mapping) whose rules grant it. */
const granters = new Map<string, Map<string, ActionGranter>>();
for (const { name, entries, mapping } of packs) {
  for (const entry of entries) {
    for (const id of grantedIds(entry.rules)) {
      const found = granters.get(id) ?? new Map<string, ActionGranter>();
      found.set(`${name}/${entry.slug}`, { kind: entry.kind, mapping: mapping[entry.slug] });
      granters.set(id, found);
    }
  }
}

/** Proposes for one pack, writes its mapping file when there is anything new, and returns the report line. */
async function proposePack({ name, entries, written, mapping }: (typeof packs)[number]): Promise<string> {
  const actions = entries.filter((entry) => entry.kind === ContentKind.Action);
  const mapped = Object.entries(mapping).flatMap(([slug, found]) =>
    found.aon === undefined ? [] : [slug as EntrySlug],
  );
  const { proposals, excepted, unlinked } = proposeGrantedActions(
    actions.map((action) => ({ slug: action.slug, grantedBy: [...(granters.get(action.id)?.values() ?? [])] })),
    new Set(mapped),
  );
  if (proposals.size > 0) {
    // Merge into the file as written: parsing reorders each entry's keys, which would rewrite every line.
    const merged = Object.fromEntries(
      [
        ...Object.entries(written),
        ...[...proposals].map(([slug, { book, aon, page }]) => [slug, { book, aon, page }] as const),
      ].toSorted(([left], [right]) => left.localeCompare(right)),
    );
    await Bun.write(path.join(ENRICHMENT, `${name}.json`), `${JSON.stringify(merged, undefined, JSON_INDENT)}\n`);
  }
  return `${name}: ${proposals.size} mapped, ${excepted.length} excepted, ${unlinked.length} unlinked`;
}

const lines = await Promise.all(packs.map(async (pack) => proposePack(pack)));
console.log(lines.filter((line) => !line.endsWith(': 0 mapped, 0 excepted, 0 unlinked')).join('\n'));
