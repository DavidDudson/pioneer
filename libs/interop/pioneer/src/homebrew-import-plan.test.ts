import { describe, expect, test } from 'bun:test';

import { ContentLicense, ContentText, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, installRulesFakes } from '@pioneer/rules/sdk/testing';

import { EmbeddedPack } from './embedded-homebrew';
import { HomebrewEntryOutcome, HomebrewPackStatus, planHomebrewImport } from './homebrew-import-plan';
import type { ExistingPacks } from './homebrew-import-plan';

installRulesFakes();

const PACK = PackId.parse('my-homebrew');
const built = new ContentPackBuilder()
  .withId(PACK)
  .withFeat('sharpshooter')
  .withItem('weapon', 'moon-blade', {
    baseItem: 'longsword',
    bulk: 1,
    category: 'martial',
    group: 'sword',
    damage: { dice: 1, die: 'd8', damageType: 'slashing' },
    usage: { type: 'held', hands: 'one' },
  })
  .build();
function builtEntry(index: number): ContentEntry {
  const entry = built.otherEntries[index];
  if (entry === undefined) {
    throw new Error('Expected the builder to make a feat and an item');
  }
  return entry;
}

const feat = builtEntry(0);
const item = builtEntry(1);

function embedded(entries: readonly ContentEntry[]): EmbeddedPack {
  return EmbeddedPack.parse({
    pack: {
      id: PACK,
      title: ContentText.parse('Mine'),
      publisher: ContentText.parse('Me'),
      license: ContentLicense.Homebrew,
    },
    entries,
  });
}

function held(ownedByImporter: boolean, ...entries: ContentEntry[]): ExistingPacks {
  return new Map([
    [PACK, { ownedByImporter, entries: new Map(entries.map((entry) => [EntrySlug.parse(entry.slug), entry])) }],
  ]);
}

function outcomes(existing: ExistingPacks): (string | undefined)[] {
  const [plan] = planHomebrewImport([embedded([feat, item])], existing);
  return plan?.report.entries.map((entry) => entry.outcome) ?? [];
}

describe('planHomebrewImport', () => {
  test('makes a pack the server lacks, with every entry', () => {
    const [plan] = planHomebrewImport([embedded([feat, item])], new Map());

    expect(plan?.report.status).toBe(HomebrewPackStatus.New);
    expect(outcomes(new Map())).toStrictEqual([HomebrewEntryOutcome.Create, HomebrewEntryOutcome.Create]);
    expect(plan?.toCreate).toStrictEqual([feat, item]);
  });

  test('reuses identical entries and adds the missing ones to the importer’s own pack', () => {
    const [plan] = planHomebrewImport([embedded([feat, item])], held(true, feat));

    expect(plan?.report.status).toBe(HomebrewPackStatus.Own);
    expect(plan?.report.entries.map((entry) => entry.outcome)).toStrictEqual([
      HomebrewEntryOutcome.Reuse,
      HomebrewEntryOutcome.Create,
    ]);
    expect(plan?.toCreate).toStrictEqual([item]);
  });

  test('reports a different entry under the same slug as a clash and never writes it', () => {
    const changed: ContentEntry = { ...feat, name: ContentText.parse('Not the same') };
    const [plan] = planHomebrewImport([embedded([feat])], held(true, changed));

    expect(plan?.report.entries.map((entry) => entry.outcome)).toStrictEqual([HomebrewEntryOutcome.Clash]);
    expect(plan?.toCreate).toStrictEqual([]);
  });

  test('adds nothing to another user’s pack: identical entries are reused, the rest clash', () => {
    const [plan] = planHomebrewImport([embedded([feat, item])], held(false, feat));

    expect(plan?.report.status).toBe(HomebrewPackStatus.Taken);
    expect(plan?.report.entries.map((entry) => entry.outcome)).toStrictEqual([
      HomebrewEntryOutcome.Reuse,
      HomebrewEntryOutcome.Clash,
    ]);
    expect(plan?.toCreate).toStrictEqual([]);
  });

  test('treats entries with the same content as identical whatever the key order', () => {
    const reordered = Object.fromEntries(Object.entries(feat).toReversed()) as ContentEntry;
    const [plan] = planHomebrewImport([embedded([feat])], held(false, reordered));

    expect(plan?.report.entries.map((entry) => entry.outcome)).toStrictEqual([HomebrewEntryOutcome.Reuse]);
  });
});
