import { describe, expect, test } from 'bun:test';

import { BookId, CreatureRole } from '@pioneer/rules/sdk';

import { creatureReport } from './dry-run-report';
import { readFoundryRelease } from './foundry-release';
import { selectCreatures, SkipReason } from './select-entries';
import type { CreatureSelection } from './select-entries';

const ROOT = 'pf2e-pf2e-8.6.0';
const monsterCore = BookId.parse('monster-core');
const gmCore = BookId.parse('gm-core');

const manifest = {
  packs: [
    { name: 'pathfinder-monster-core', path: 'packs/pathfinder-monster-core', type: 'Actor' },
    { name: 'npc-gallery', path: 'packs/npc-gallery', type: 'Actor' },
    { name: 'hazards', path: 'packs/hazards', type: 'Actor' },
    { name: 'feats-srd', path: 'packs/feats', type: 'Item' },
  ],
  languages: [{ lang: 'en', name: 'Main (English)', path: 'lang/en.json' }],
};

const remaster = (title: string): object => ({ title, license: 'ORC', remaster: true });

/** A trimmed actor: its publication and level in `system.details`, its traits, and the embedded items it names. */
interface Extras {
  readonly type?: string;
  readonly level?: number;
  readonly items?: readonly string[];
}

function creatureDoc(name: string, publication: object | undefined, extras: Extras = {}): object {
  const { type = 'npc', level = 1, items = [] } = extras;
  return {
    _id: `${name}Id`,
    name,
    type,
    system: {
      details: { publication, level: { value: level }, blurb: '' },
      traits: { value: ['humanoid'], rarity: 'common', size: { value: 'med' } },
      attributes: { ac: { value: 15 }, hp: { max: 20 }, adjustment: 0 },
      initiative: { statistic: 'perception' },
    },
    items: items.map((itemType, index) => ({ _id: `item${index}`, name: itemType, type: itemType })),
  };
}

const files: Record<string, unknown> = {
  'system.pf2e.json': manifest,
  'static/lang/en.json': { PF2E: {} },
  'packs/pf2e/pathfinder-monster-core/ogre.json': creatureDoc('Ogre', remaster('Pathfinder Monster Core'), {
    level: 3,
    items: ['melee', 'action', 'effect'],
  }),
  'packs/pf2e/pathfinder-monster-core/rat.json': creatureDoc('Rat', remaster('Pathfinder Monster Core'), {
    level: -1,
  }),
  'packs/pf2e/pathfinder-monster-core/old.json': creatureDoc('Old', {
    title: 'Pathfinder Bestiary',
    remaster: false,
  }),
  'packs/pf2e/pathfinder-monster-core/mystery.json': creatureDoc('Mystery', remaster('Pathfinder Unknown Book')),
  'packs/pf2e/pathfinder-monster-core/ogl.json': creatureDoc('Ogl', {
    title: 'Pathfinder Monster Core',
    license: 'OGL',
    remaster: true,
  }),
  'packs/pf2e/pathfinder-monster-core/gm.json': creatureDoc('GmCreature', remaster('Pathfinder GM Core')),
  'packs/pf2e/pathfinder-monster-core/untitled.json': creatureDoc('Untitled', undefined),
  'packs/pf2e/pathfinder-monster-core/familiar.json': creatureDoc('Cat', remaster('Pathfinder Monster Core'), {
    type: 'familiar',
  }),
  'packs/pf2e/npc-gallery/guard.json': creatureDoc('Guard', remaster('Pathfinder Monster Core'), {
    items: ['melee'],
  }),
  'packs/pf2e/hazards/trap.json': creatureDoc('Trap', remaster('Pathfinder Monster Core'), { type: 'hazard' }),
  'packs/pf2e/feats/power-attack.json': { _id: 'p', name: 'Power Attack', type: 'feat', system: {} },
};

function archive(extra: Record<string, string> = {}): ReadonlyMap<string, string> {
  const texts = Object.entries(files).map(([path, json]) => [`${ROOT}/${path}`, JSON.stringify(json)] as const);
  const raw = Object.entries(extra).map(([path, text]) => [`${ROOT}/${path}`, text] as const);
  return new Map([...texts, ...raw]);
}

function select(targets: ReadonlySet<BookId> = new Set([monsterCore])): CreatureSelection {
  return selectCreatures(readFoundryRelease(archive()), targets);
}

function nameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

describe('selectCreatures', () => {
  test('keeps the npc actors of the target book, with the role their pack gives them', () => {
    const { selected } = select();

    expect(selected.map(({ actor: { name }, role }) => [name, role])).toStrictEqual([
      ['Guard', CreatureRole.Npc],
      ['Ogre', CreatureRole.Monster],
      ['Rat', CreatureRole.Monster],
    ]);
    expect(selected.every(({ book }) => book === monsterCore)).toBe(true);
  });

  test('skips a hazard under its own reason, and other actor types as unsupported', () => {
    const { skipped } = select();
    const reasonOf = (file: string): string | undefined => skipped.find(({ path }) => nameOf(path) === file)?.reason;

    expect(reasonOf('trap.json')).toBe(SkipReason.Hazard);
    expect(reasonOf('familiar.json')).toBe(SkipReason.UnsupportedType);
  });

  test('applies the item rules: remaster, ORC, a known book and a targeted one', () => {
    const { skipped } = select();
    const reasonOf = (file: string): string | undefined => skipped.find(({ path }) => nameOf(path) === file)?.reason;

    expect(reasonOf('old.json')).toBe(SkipReason.Legacy);
    expect(reasonOf('ogl.json')).toBe(SkipReason.NotOrc);
    expect(reasonOf('mystery.json')).toBe(SkipReason.UnknownBook);
    expect(reasonOf('untitled.json')).toBe(SkipReason.UnknownBook);
    expect(reasonOf('gm.json')).toBe(SkipReason.NotTargeted);
  });

  test('selects the other book when it is the target', () => {
    const { selected } = select(new Set([gmCore]));

    expect(selected.map(({ actor }) => actor.name)).toStrictEqual(['GmCreature']);
  });

  test('does not select item pack documents', () => {
    const { selected, skipped } = select();

    expect([...selected, ...skipped].some(({ path }) => path.includes('/feats/'))).toBe(false);
  });
});

describe('creatureReport', () => {
  test('counts creatures by book, role and level, and skips by reason', () => {
    const { imported, skipped } = creatureReport(select());

    expect(imported).toStrictEqual([
      { book: monsterCore, role: CreatureRole.Monster, level: -1, count: 1 },
      { book: monsterCore, role: CreatureRole.Monster, level: 3, count: 1 },
      { book: monsterCore, role: CreatureRole.Npc, level: 1, count: 1 },
    ]);
    expect(skipped.map(({ reason, count }) => [reason, count])).toStrictEqual([
      [SkipReason.UnsupportedType, 1],
      [SkipReason.Hazard, 1],
      [SkipReason.Legacy, 1],
      [SkipReason.NotOrc, 1],
      [SkipReason.UnknownBook, 1],
      [SkipReason.UnknownBook, 1],
      [SkipReason.NotTargeted, 1],
    ]);
  });

  test('names the actor fields and item types the stat block has no home for', () => {
    const { fieldGaps } = creatureReport(select());

    expect(fieldGaps).toStrictEqual([
      { key: 'system.attributes.adjustment', count: 3 },
      { key: 'system.details.blurb', count: 3 },
      { key: 'system.initiative.statistic', count: 3 },
      { key: 'item:effect', count: 1 },
    ]);
  });
});
