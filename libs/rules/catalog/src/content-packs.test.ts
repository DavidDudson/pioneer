import { describe, expect, test } from 'bun:test';

import { ContentEntryFile, ContentKind, ContentRegistry, spellEffectId } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

/**
 * Every id the TypeScript packs had when they moved to `content/packs` (#323), as kind-prefixed slugs (ADR-0034)
 * renamed them. Ids are stored on characters, so a pack edit that changes one is a data migration, not a JSON change.
 */
const PINNED_IDS: Readonly<Record<string, string>> = {
  'core-rules/statistic:acrobatics': 'a6e7e63b-84e0-54eb-90db-dad5349cc11a',
  'core-rules/statistic:arcana': 'a696ec98-9f99-54e7-b01f-8492aeda31e3',
  'core-rules/statistic:armor-class': '7737d8ba-61d5-58d1-9215-46987c2bb483',
  'core-rules/statistic:athletics': '5856029a-f484-558f-84b4-9ffe6321007c',
  'core-rules/statistic:class-dc': 'e329ba71-6879-5ab9-be72-cb8f4324b343',
  'core-rules/statistic:crafting': 'c4f4a157-362d-5947-81a1-984b542635a3',
  'core-rules/statistic:deception': 'cdd83def-a954-58f5-8134-be7d9765bc30',
  'core-rules/statistic:diplomacy': '82aaf7e3-8e0b-5f5e-872f-28840a7f07ff',
  'core-rules/statistic:fortitude': 'c16299b7-d064-540c-8c4b-659ef89d4cc0',
  'core-rules/statistic:hit-points': '0517252b-998f-5592-979f-94762a803160',
  'core-rules/statistic:intimidation': '1a984615-e95d-57e1-91d3-58caa6bf17df',
  'core-rules/statistic:land-speed': '5aa7bd1a-accb-536c-9f5f-8f3b5ebe4399',
  'core-rules/statistic:medicine': '9516eda9-9dcf-59ea-99d9-78b20b64d734',
  'core-rules/statistic:nature': '392a2f87-4c11-5824-b927-07254c8ef7e3',
  'core-rules/statistic:occultism': 'be4749d6-c4e0-5f2d-8282-5966cc2cbc94',
  'core-rules/statistic:perception': 'd7d3a54b-f54a-5756-8341-4ad40b1444ba',
  'core-rules/statistic:performance': '23d62123-d33e-5440-be8b-c957a6f06f37',
  'core-rules/variant-rule:dual-class': 'c46b73e0-50a1-523c-a265-c4037861c84e',
  'core-rules/variant-rule:free-archetype': 'e3987b2d-66c3-5fc9-a208-c77d07fbe9ef',
  'core-rules/variant-rule:no-dedication-lock': '740e30fe-b997-5430-9a5b-6eab94136a61',
  'core-rules/variant-rule:proficiency-without-level': 'a8e09e01-8dbe-5055-920b-453ebd93493d',
  'core-rules/statistic:reflex': '1e0faae5-d668-5df4-ae46-9612aa44a84d',
  'core-rules/statistic:religion': '958254ce-39e2-5550-93b4-751248304054',
  'core-rules/statistic:society': 'e130f966-439e-5be5-a430-fa6eb0127c8c',
  'core-rules/statistic:stealth': 'a93683a0-b551-5be9-8374-1824003f6c94',
  'core-rules/statistic:survival': '72ad4eab-fe31-5eaa-aec1-d936eab77ac2',
  'core-rules/statistic:thievery': 'd0b8f701-f8a4-5ef3-9ae5-392b2cb24415',
  'core-rules/statistic:will': '6982b489-c23e-5712-8d46-634dfc9b45ad',
  'monster-core/creature:zombie-shambler': '3ae2bd31-47ee-52f1-ba35-f3d2e23db3c9',
  'player-core/ancestry:dwarf': 'e6d808d9-95b9-5477-8322-791194226314',
  'player-core/ancestry:elf': '85929532-15d1-52c2-8500-d3b27f174266',
  'player-core/ancestry:gnome': 'be1b027a-40cb-5267-ac66-7cdc1c0d7813',
  'player-core/ancestry:goblin': '054f4768-e40c-50b9-bf71-cebc5bd9064e',
  'player-core/ancestry:halfling': 'abf704ef-d31d-527c-b030-3bd58a49b0bd',
  'player-core/ancestry:human': '58312ecf-5705-5e7d-b695-248d34618288',
  'player-core/ancestry:leshy': '54baa0f3-c686-58a5-91b3-4ccfa6b8d011',
  'player-core/ancestry:orc': '27e47483-e581-53af-992f-7b19ac052ab4',
};

/** Every entry the registry serves, by `<pack>/<slug>`. */
async function registryIds(): Promise<Record<string, string>> {
  const registry = new ContentRegistry();
  await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
  const entries = [
    ...registry.ancestries(),
    ...registry.creatures(),
    ...registry.statistics(),
    ...registry.variantRules(),
  ];
  return Object.fromEntries(entries.map((entry) => [entry.key, entry.id]));
}

/** The ancestries and the language and sense entries they name, read from their JSON files. */
async function ancestryAndReferenceEntries(): Promise<readonly ContentEntry[]> {
  const files = await Promise.all([
    import('@pioneer/content/packs/player-core/ancestry.json'),
    import('@pioneer/content/packs/core-rules/language.json'),
    import('@pioneer/content/packs/core-rules/sense.json'),
  ]);
  return files.flatMap((file) => ContentEntryFile.parse(file.default));
}

function idsOf(entries: readonly ContentEntry[], kind: ContentKind): readonly ContentId[] {
  return entries.filter((entry) => entry.kind === kind).map((entry) => entry.id);
}

interface AncestryReferences {
  readonly languages: readonly ContentId[];
  readonly senses: readonly ContentId[];
}

/** The language and sense entries the pack's ancestries name. */
function ancestryReferences(entries: readonly ContentEntry[]): AncestryReferences {
  const ancestries = entries.flatMap((entry) => (entry.kind === ContentKind.Ancestry ? [entry.data] : []));
  return {
    languages: ancestries.flatMap((data) => [...data.languages, ...data.additionalLanguages.options]),
    senses: ancestries.flatMap((data) => (data.vision === undefined ? [] : [data.vision])),
  };
}

/** The spells and effects of the player-core pack, read from their JSON files. */
async function spellAndEffectEntries(): Promise<readonly ContentEntry[]> {
  const files = await Promise.all([
    import('@pioneer/content/packs/player-core/spell.json'),
    import('@pioneer/content/packs/player-core/effect.json'),
  ]);
  return files.flatMap((file) => ContentEntryFile.parse(file.default));
}

/** The effect ids the pack's spells list. */
function spellEffects(entries: readonly ContentEntry[]): readonly ContentId[] {
  return entries.flatMap((entry) =>
    entry.kind === ContentKind.Spell ? (entry.data.effects ?? []).map((listed) => spellEffectId(listed)) : [],
  );
}

describe('content packs', () => {
  test('every effect a spell lists is an effect entry of the pack', async () => {
    const entries = await spellAndEffectEntries();
    const effects = new Set(idsOf(entries, ContentKind.Effect));
    const listed = spellEffects(entries);
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.filter((id) => !effects.has(id))).toStrictEqual([]);
  });

  test('every pinned id is unchanged', async () => {
    const ids = await registryIds();
    expect(ids).toMatchObject(PINNED_IDS);
  });

  test('every language and vision an ancestry names is a core rules entry of that kind', async () => {
    const entries = await ancestryAndReferenceEntries();
    const languages = new Set(idsOf(entries, ContentKind.Language));
    const senses = new Set(idsOf(entries, ContentKind.Sense));
    const references = ancestryReferences(entries);
    expect(references.languages.length).toBeGreaterThan(0);
    expect(references.languages.filter((id) => !languages.has(id))).toStrictEqual([]);
    expect(references.senses.filter((id) => !senses.has(id))).toStrictEqual([]);
  });
});
