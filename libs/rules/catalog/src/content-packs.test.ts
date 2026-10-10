import { describe, expect, test } from 'bun:test';

import { ContentEntryFile, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

/**
 * Every id the TypeScript packs had when they moved to `content/packs` (#323). Ids are stored on characters, so a
 * pack edit that changes one is a data migration, not a JSON change.
 */
const PINNED_IDS: Readonly<Record<string, string>> = {
  'core-rules/acrobatics': '5f93daa2-5dc6-5af6-b86e-b291be01f876',
  'core-rules/arcana': '56be0bbc-a57a-542a-b8b4-570bf07dc8d8',
  'core-rules/armor-class': 'd81fa877-5d2c-590b-be51-2c848e447da4',
  'core-rules/athletics': 'fe748c5a-e667-58cc-b941-4fd6bf566bc3',
  'core-rules/class-dc': '3d4b4a27-6298-5549-aca6-d1df3619c89e',
  'core-rules/crafting': 'ae010692-344b-530a-9ddd-f8e31b289b76',
  'core-rules/deception': '78e74d14-6c63-5538-8b40-cad3590eb2e1',
  'core-rules/diplomacy': '7ed070f0-3dbd-5ad0-a740-b030c1b04049',
  'core-rules/fortitude': 'aa960dea-e6c9-561d-85f2-8c33dc8d64be',
  'core-rules/hit-points': '99017053-1d73-5d98-911e-846f6b168f26',
  'core-rules/intimidation': '2b23951d-4642-55fa-9e70-03c7cb56ffa7',
  'core-rules/land-speed': 'b4ee899b-03a6-5180-a48e-8dd75ddfd8b4',
  'core-rules/medicine': 'c824b20d-0e3c-51db-ae5f-020a4707bf46',
  'core-rules/nature': '9b00dcfa-e2f4-543a-8888-5900529949ef',
  'core-rules/occultism': '306a75e4-5ecd-5ec6-8377-4a103b47ec93',
  'core-rules/perception': 'c37d410e-c489-596f-b8a7-9cd7640f674c',
  'core-rules/performance': '06e3d009-ea5c-5472-af03-f17fbb297f20',
  'core-rules/proficiency-without-level': '058de5b7-3536-5cbd-aadc-901767d4e75c',
  'core-rules/reflex': 'ab19db15-90c5-511b-84b2-4421d45a317e',
  'core-rules/religion': 'a8f69f35-c442-52d2-894b-5266e1852b0b',
  'core-rules/society': 'be7a2bcd-7d42-5a36-9d29-fbe653ea6faa',
  'core-rules/stealth': '1f21561d-63a0-5622-afb7-9e337cb46d62',
  'core-rules/survival': '6ee19ee3-33de-5792-9a4e-cc398084e346',
  'core-rules/thievery': 'ed635993-27d2-5866-9acb-039250e16e6c',
  'core-rules/will': '3961124b-8b81-5793-99a2-bd45189b2a5c',
  'monster-core/zombie-shambler': '8302a500-eb59-5cf8-812d-5c742447e1ae',
  'player-core/dwarf': '87d49891-adee-522e-b478-93e77308482b',
  'player-core/elf': 'd10d29db-62ec-5b40-984e-cd3bfce29991',
  'player-core/gnome': 'baa51e19-9701-53d3-9589-acaa8e3744a2',
  'player-core/goblin': '19b27be4-62c2-5050-9ccd-2b960ba3194b',
  'player-core/halfling': 'da9f0ffe-16b0-5f1b-8f2f-4f0f253c057d',
  'player-core/human': 'f10cdb85-0c8e-5795-9741-a0f4790f2bf3',
  'player-core/leshy': '24425fee-2efe-50a0-83a9-011cf28c3d24',
  'player-core/orc': '169f1809-dcaf-5293-b603-f7a12cdc6084',
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

/** Every Player Core entry, read from its JSON files. */
async function playerCoreEntries(): Promise<readonly ContentEntry[]> {
  const files = await Promise.all([
    import('@pioneer/content/packs/player-core/ancestry.json'),
    import('@pioneer/content/packs/player-core/language.json'),
    import('@pioneer/content/packs/player-core/sense.json'),
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

describe('content packs', () => {
  test('every id from before the move to JSON is unchanged', async () => {
    const ids = await registryIds();
    expect(ids).toMatchObject(PINNED_IDS);
  });

  test('every language and vision an ancestry names is a Player Core entry of that kind', async () => {
    const entries = await playerCoreEntries();
    const languages = new Set(idsOf(entries, ContentKind.Language));
    const senses = new Set(idsOf(entries, ContentKind.Sense));
    const references = ancestryReferences(entries);
    expect(references.languages.length).toBeGreaterThan(0);
    expect(references.languages.filter((id) => !languages.has(id))).toStrictEqual([]);
    expect(references.senses.filter((id) => !senses.has(id))).toStrictEqual([]);
  });
});
