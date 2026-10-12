import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry, RuleElementKey, Trait } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

const FOCUS = Trait.parse('focus');

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const entries = registry.packs.flatMap((pack) => pack.otherEntries);
const byId = new Map(entries.map((entry) => [entry.id, entry]));

/** Every entry a rich text value links, in reading order. */
function refsIn(node: unknown): ContentId[] {
  if (Array.isArray(node)) {
    return node.flatMap((child) => refsIn(child));
  }
  if (typeof node !== 'object' || node === null) {
    return [];
  }
  const own = 'type' in node && node.type === 'ref' && 'id' in node ? [node.id as ContentId] : [];
  return [...own, ...Object.values(node).flatMap((child) => refsIn(child))];
}

/** The spells an entry's `PoolSpells` elements name, in order. */
function poolSpellsOf(entry: ContentEntry): ContentId[] {
  return entry.rules.flatMap((rule) => (rule.key === RuleElementKey.PoolSpells ? rule.spells : []));
}

/** Whether `id` is a spell that goes in a slot: a school's description also links its focus spells. */
function isSlotSpell(id: ContentId): boolean {
  const linked = byId.get(id);
  return linked?.kind === ContentKind.Spell && !linked.traits.includes(FOCUS);
}

const schools = entries.filter(
  (entry) => entry.kind === ContentKind.ClassFeature && entry.slug.startsWith('class-feature:school-of-'),
);

describe('Player Core pool spells', () => {
  test.each(schools.map((school) => [school.slug, school] as const))(
    "%s's curriculum is the spells its description's table lists, cantrips then by rank",
    (_slug, school) => {
      const listed = refsIn(school.description).filter((id) => isSlotSpell(id));

      expect(poolSpellsOf(school)).toStrictEqual(listed);
    },
  );

  test('every pool spell is a spell in a loaded pack', () => {
    const named = entries.flatMap((entry) => poolSpellsOf(entry));

    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((id) => byId.get(id)?.kind !== ContentKind.Spell)).toStrictEqual([]);
  });
});
