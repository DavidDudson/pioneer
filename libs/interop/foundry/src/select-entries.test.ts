import { describe, expect, test } from 'bun:test';

import { BookId } from '@pioneer/rules/sdk';

import { dryRunReport } from './dry-run-report';
import { readFoundryRelease } from './foundry-release';
import type { FoundryRelease } from './foundry-release';
import { selectEntries, SkipReason } from './select-entries';

const ROOT = 'pf2e-pf2e-8.6.0';
const playerCore = BookId.parse('player-core');
const gmCore = BookId.parse('gm-core');

const manifest = {
  packs: [
    { name: 'feats-srd', path: 'packs/feats', type: 'Item' },
    { name: 'equipment-srd', path: 'packs/equipment', type: 'Item' },
    { name: 'pathfinder-bestiary', path: 'packs/pathfinder-bestiary', type: 'Actor' },
  ],
};

function item(name: string, type: string, publication?: object): object {
  return { _id: `${name}Id`, name, type, img: 'icon.webp', system: { publication, rules: [] } };
}

const remaster = (title: string): object => ({ title, license: 'ORC', remaster: true });

const files: Record<string, unknown> = {
  'system.pf2e.json': manifest,
  'static/lang/en.json': { PF2E: { TraitFire: 'Fire' } },
  'packs/pf2e/feats/_folders.json': [{ name: 'Class' }],
  'packs/pf2e/feats/class/power-attack.json': item('Power Attack', 'feat', remaster('Pathfinder Player Core')),
  'packs/pf2e/feats/general/toughness.json': item('Toughness', 'feat', remaster('Pathfinder Player Core')),
  'packs/pf2e/feats/general/old-feat.json': item('Old Feat', 'feat', {
    title: 'Pathfinder Core Rulebook',
    remaster: false,
  }),
  'packs/pf2e/feats/general/ap-feat.json': item('AP Feat', 'feat', remaster('Pathfinder #209: Destroyer’s Doom')),
  'packs/pf2e/feats/general/no-publication.json': item('Untitled', 'feat'),
  'packs/pf2e/equipment/longsword.json': item('Longsword', 'weapon', remaster(' Pathfinder Player Core ')),
  'packs/pf2e/equipment/staff.json': item('Staff', 'weapon', remaster('Pathfinder GM Core')),
  'packs/pf2e/equipment/campaign.json': item('Campaign', 'campaignFeature', remaster('Pathfinder Player Core')),
  'packs/pf2e/pathfinder-bestiary/goblin.json': { _id: 'g', name: 'Goblin', type: 'npc', system: {} },
};

function archiveFiles(extra: Record<string, string> = {}): ReadonlyMap<string, string> {
  const texts = Object.entries(files).map(([path, json]) => [`${ROOT}/${path}`, JSON.stringify(json)] as const);
  const raw = Object.entries(extra).map(([path, text]) => [`${ROOT}/${path}`, text] as const);
  return new Map([...texts, ...raw]);
}

function release(extra?: Record<string, string>): FoundryRelease {
  return readFoundryRelease(archiveFiles(extra));
}

function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function names(paths: readonly { readonly path: string }[]): string[] {
  return paths.map(({ path }) => fileName(path));
}

describe('readFoundryRelease', () => {
  test('reads item packs only, without folder files, by compendium name and directory', () => {
    const { documents, lang } = release();

    expect(documents).toHaveLength(8);
    expect(documents.some(({ document }) => document.name === 'Goblin')).toBe(false);
    expect(documents.find(({ document }) => document.name === 'Longsword')?.pack).toEqual({
      name: 'equipment-srd',
      directory: 'equipment',
    });
    expect(lang).toEqual({ PF2E: { TraitFire: 'Fire' } });
  });

  test('keeps fields it does not read', () => {
    const toughness = release().documents.find(({ document }) => document.name === 'Toughness');

    expect(toughness?.document).toMatchObject({ img: 'icon.webp', system: { rules: [] } });
  });

  test('reports a file that is not JSON or lacks a field, and keeps reading', () => {
    const { documents, unreadable } = release({
      'packs/pf2e/feats/broken.json': '{',
      'packs/pf2e/feats/typeless.json': JSON.stringify({ _id: 'x', name: 'Typeless', system: {} }),
    });

    expect(names(unreadable)).toEqual(['broken.json', 'typeless.json']);
    expect(documents).toHaveLength(8);
  });

  test('fails without the manifest or the lang table', () => {
    const withoutLang = new Map([...archiveFiles()].filter(([path]) => !path.endsWith('en.json')));

    expect(() => readFoundryRelease(withoutLang)).toThrow('static/lang/en.json');
  });
});

describe('selectEntries', () => {
  test('keeps remaster entries of supported types from the target books', () => {
    const { selected } = selectEntries(release(), new Set([playerCore]));

    expect(names(selected).toSorted()).toEqual(['longsword.json', 'power-attack.json', 'toughness.json']);
    expect(selected.every(({ book }) => book === playerCore)).toBe(true);
  });

  test('reports every other document with its reason and detail', () => {
    const { skipped } = selectEntries(release({ 'packs/pf2e/feats/broken.json': '{' }), new Set([playerCore]));
    const [broken, ...rest] = skipped;
    const reasons = rest.map(({ path, reason, detail }) => [fileName(path), reason, detail]);

    expect(broken).toMatchObject({ reason: SkipReason.Unreadable, path: 'packs/pf2e/feats/broken.json' });
    expect(broken?.detail).toContain('JSON');
    expect(reasons).toEqual([
      ['campaign.json', SkipReason.UnsupportedType, 'campaignFeature'],
      ['staff.json', SkipReason.NotTargeted, 'gm-core'],
      ['ap-feat.json', SkipReason.UnknownBook, 'Pathfinder #209: Destroyer’s Doom'],
      ['no-publication.json', SkipReason.UnknownBook, ''],
      ['old-feat.json', SkipReason.Legacy, 'Pathfinder Core Rulebook'],
    ]);
  });

  test('selects from every target book', () => {
    const { selected } = selectEntries(release(), new Set([playerCore, gmCore]));

    expect(names(selected)).toContain('staff.json');
  });
});

describe('dryRunReport', () => {
  test('counts imports by book and type, and skips by reason', () => {
    const report = dryRunReport(selectEntries(release(), new Set([playerCore])));

    expect(report).toEqual({
      imported: [
        { book: playerCore, type: 'feat', count: 2 },
        { book: playerCore, type: 'weapon', count: 1 },
      ],
      skipped: [
        { reason: SkipReason.UnsupportedType, detail: 'campaignFeature', count: 1 },
        { reason: SkipReason.Legacy, detail: '', count: 1 },
        { reason: SkipReason.UnknownBook, detail: '', count: 1 },
        { reason: SkipReason.UnknownBook, detail: 'Pathfinder #209: Destroyer’s Doom', count: 1 },
        { reason: SkipReason.NotTargeted, detail: 'gm-core', count: 1 },
      ],
    });
  });
});
