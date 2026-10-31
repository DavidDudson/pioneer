import { describe, expect, test } from 'bun:test';

import { grantLookup, resolveGrants } from '@pioneer/rules/grants';
import type { GrantResolution } from '@pioneer/rules/grants';
import { ChoiceValue, ContentRegistry, EntrySlug, Level, SlotKey } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

/**
 * A cleric's doctrine grants its doctrine features at their levels. Foundry wires them through `flags.system.cleric`;
 * Pioneer's generic First to Final Doctrine features grant the feature of the doctrine the character has (#616).
 */

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const entries = registry.packs.flatMap((pack) => pack.otherEntries);

function idOf(slug: string): ContentId {
  const found = entries.find((entry) => entry.slug === EntrySlug.parse(slug));
  if (found === undefined) {
    throw new Error(`${slug} is not in the catalog`);
  }
  return found.id;
}

/** The cleric of `doctrine` at `level`, resolved through its grants. */
function clericAt(level: number, doctrine: string): GrantResolution {
  const resolve = (picks: ReadonlyMap<SlotKey, ChoiceValue>): GrantResolution =>
    resolveGrants({
      roots: [{ entry: idOf('class:cleric'), hop: { kind: 'choice', slot: SlotKey.parse('class') } }],
      lookup: grantLookup(registry),
      level: Level.parse(level),
      situation: [],
      picks,
      rootSlots: [],
      toggles: new Map(),
      namespaces: registry.rollOptionNamespaces(),
    });
  const open = resolve(new Map()).open.find((slot) => slot.options.some(({ label }) => String(label) === 'Warpriest'));
  const picks = new Map<SlotKey, ChoiceValue>(
    open === undefined ? [] : [[open.key, ChoiceValue.parse(idOf(`class-feature:${doctrine}`))]],
  );
  return resolve(picks);
}

const names = (result: GrantResolution): string[] => result.items.map(({ entry }) => entry.name);

describe('a cleric’s doctrine', () => {
  test('a 1st-level warpriest has First Doctrine (Warpriest) and Shield Block', () => {
    const result = clericAt(1, 'warpriest');

    expect(names(result)).toContain('First Doctrine (Warpriest)');
    expect(names(result)).toContain('Shield Block');
    expect(names(result)).not.toContain('First Doctrine (Cloistered Cleric)');
  });

  test('a cloistered cleric has its own first doctrine feature', () => {
    const result = clericAt(1, 'cloistered-cleric');

    expect(names(result)).toContain('First Doctrine (Cloistered Cleric)');
    expect(names(result)).not.toContain('First Doctrine (Warpriest)');
  });

  test('a warpriest gains the later doctrine features at their levels', () => {
    expect(names(clericAt(3, 'warpriest'))).toContain('Second Doctrine (Warpriest)');
    expect(names(clericAt(2, 'warpriest'))).not.toContain('Second Doctrine (Warpriest)');
    expect(names(clericAt(19, 'warpriest'))).toContain('Final Doctrine (Warpriest)');
  });
});
