import { describe, expect, test } from 'bun:test';

import { grantLookup, resolveGrants } from '@pioneer/rules/grants';
import type { GrantResolution } from '@pioneer/rules/grants';
import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import { ChoiceValue, ContentKind, ContentRegistry, EntrySlug, Level, SlotKey } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

/**
 * Bard, Druid and Witch Dedication let the character pick a muse, order or patron as the classes do, so a prerequisite
 * that names one (Martial Performance: "warrior muse") can be checked for an archetype character (#618).
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

/** A character holding `dedication`, resolved through its grants, with the first choice it offers answered by `pick`. */
function withDedication(dedication: string, pick?: string): GrantResolution {
  const resolve = (picks: ReadonlyMap<SlotKey, ChoiceValue>): GrantResolution =>
    resolveGrants({
      roots: [{ entry: idOf(dedication), hop: { kind: 'choice', slot: SlotKey.parse('class-feat-2') } }],
      lookup: grantLookup(registry),
      level: Level.parse(2),
      situation: [],
      picks,
      rootSlots: [],
      toggles: new Map(),
      namespaces: registry.rollOptionNamespaces(),
    });
  const [open] = resolve(new Map()).open;
  if (open === undefined || pick === undefined) {
    return resolve(new Map());
  }
  const choice = ChoiceValue.parse(idOf(pick));
  return resolve(new Map([[open.key, choice]]));
}

/** Whether a character with `resolution` meets the prerequisite of the feat `slug`. */
function meets(resolution: GrantResolution, slug: string): Truth {
  const feat = entries.find((entry) => entry.slug === EntrySlug.parse(slug));
  if (feat?.kind !== ContentKind.Feat || feat.data.prerequisitePredicate === undefined) {
    throw new Error(`${slug} has no prerequisite predicate`);
  }
  return evaluatePredicate(feat.data.prerequisitePredicate, resolution.facts);
}

describe('Bard Dedication', () => {
  test('offers the muses, and a character with the warrior muse meets a "warrior muse" prerequisite', () => {
    const [open] = withDedication('feat:bard-dedication').open;

    expect(open?.options.map(({ label }) => String(label))).toContain('Warrior');
    expect(meets(withDedication('feat:bard-dedication', 'class-feature:warrior'), 'feat:martial-performance')).toBe(
      Truth.True,
    );
  });

  test('a character with another muse, or none yet, does not meet it', () => {
    expect(meets(withDedication('feat:bard-dedication', 'class-feature:maestro'), 'feat:martial-performance')).not.toBe(
      Truth.True,
    );
    expect(meets(withDedication('feat:bard-dedication'), 'feat:martial-performance')).not.toBe(Truth.True);
  });
});

describe('Druid Dedication', () => {
  test('grants the order it is picked, which meets that order’s prerequisites', () => {
    const resolution = withDedication('feat:druid-dedication', 'class-feature:storm-order');

    expect(resolution.items.map(({ entry }) => String(entry.name))).toContain('Storm Order');
    expect(meets(resolution, 'feat:thunderclap-spell')).toBe(Truth.True);
  });
});
