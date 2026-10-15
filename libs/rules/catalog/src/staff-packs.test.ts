import { describe, expect, test } from 'bun:test';

import {
  ContentId,
  contentId,
  ContentKind,
  ContentRegistry,
  EntrySlug,
  PackId,
  STAFF_CANTRIP,
  StaffRank,
} from '@pioneer/rules/sdk';
import type { ContentEntry, StaffSpells } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';
import { isStaffEntry } from './staff-matcher';

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const entries = registry.packs.flatMap((pack) => pack.otherEntries);
const byId = new Map(entries.map((entry) => [entry.id, entry]));

/** The typed spells of an entry, or none for an entry that holds no staff. */
function staffOf(entry: ContentEntry | undefined): StaffSpells {
  const holds = entry?.kind === ContentKind.Weapon || entry?.kind === ContentKind.Equipment;
  return (holds ? entry.data.staff : undefined) ?? [];
}

const typed = entries.filter((entry) => staffOf(entry).length > 0);
const FIRE_STAFF = ContentId.parse(contentId(PackId.parse('gm-core'), EntrySlug.parse('weapon:staff-of-fire-greater')));
const ranks = (...listed: readonly number[]): StaffRank[] => listed.map((rank) => StaffRank.parse(rank));

function namesAt(ids: readonly ContentId[]): readonly (string | undefined)[] {
  return ids.map((id) => byId.get(id)?.name);
}

describe('staves in the official packs', () => {
  test('Staff of Fire (Greater) lists its spells by rank, as spell entries', () => {
    const listed = staffOf(byId.get(FIRE_STAFF));

    expect(listed.map(({ rank }) => rank)).toEqual([STAFF_CANTRIP, ...ranks(1, 2, 3)]);
    expect(listed.map(({ spells }) => namesAt(spells))).toEqual([
      ['Ignition'],
      ['Breathe Fire'],
      ['Breathe Fire', 'Floating Flame'],
      ['Floating Flame', 'Fireball'],
    ]);
  });

  test('every spell a staff lists is a spell the packs hold', () => {
    const listed = typed.flatMap((entry) => staffOf(entry).flatMap(({ spells }) => spells));

    expect(listed.length).toBeGreaterThan(0);
    expect(listed.filter((id) => byId.get(id)?.kind !== ContentKind.Spell)).toEqual([]);
  });

  test('every staff with typed spells has the staff trait', () => {
    expect(typed.filter((entry) => !isStaffEntry(entry))).toEqual([]);
  });
});
