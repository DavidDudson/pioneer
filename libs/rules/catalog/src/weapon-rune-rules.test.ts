import { describe, expect, test } from 'bun:test';

import { ContentEntryFile, ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

const PACKS_DIR = `${import.meta.dir}/../../../../content/packs`;
const ETCHED_DAMAGE = 'etched-damage';

/**
 * Weapon property runes with no activation and no rules yet: each needs an engine gap closed first (a critical
 * effect, a trait or property the Strike has no way to take, a condition on the target). Remove a slug when its rules
 * land; a new book's rune must get rules or be listed here.
 */
const RECORDED_GAPS: ReadonlySet<string> = new Set([
  'rune:animated',
  'rune:astral',
  'rune:astral-greater',
  'rune:authorized',
  'rune:bane',
  'rune:brilliant',
  'rune:brilliant-greater',
  'rune:coating',
  'rune:conducting',
  'rune:decaying',
  'rune:decaying-greater',
  'rune:energy-vulnerability',
  'rune:energy-vulnerability-greater',
  'rune:extending',
  'rune:extending-greater',
  'rune:fearsome',
  'rune:fearsome-greater',
  'rune:ghost-touch',
  'rune:grievous',
  'rune:impactful',
  'rune:impactful-greater',
  'rune:keen',
  'rune:merciful',
  'rune:mythic-striking',
  'rune:mythic-weapon-potency',
  'rune:pacifying',
  'rune:quickstrike',
  'rune:returning',
  'rune:rooting',
  'rune:rooting-greater',
  'rune:rooting-major',
  'rune:rooting-true',
  'rune:shifting',
  'rune:shockwave',
  'rune:spell-reservoir',
  'rune:underwater',
  'rune:vitalizing',
  'rune:vitalizing-greater',
  'rune:vorpal',
  'rune:wounding',
]);

interface EnergyRune {
  readonly slug: string;
  readonly type: string;
  /** Dice of persistent damage added on a critical hit. */
  readonly persistent?: number;
}

/** The extra damage each energy rune adds: one `d6` of its type, and the persistent dice on a critical hit. */
const ENERGY_RUNES: readonly EnergyRune[] = [
  { slug: 'rune:corrosive', type: 'acid' },
  { slug: 'rune:corrosive-greater', type: 'acid' },
  { slug: 'rune:flaming', type: 'fire', persistent: 1 },
  { slug: 'rune:flaming-greater', type: 'fire', persistent: 2 },
  { slug: 'rune:frost', type: 'cold' },
  { slug: 'rune:frost-greater', type: 'cold' },
  { slug: 'rune:shock', type: 'electricity' },
  { slug: 'rune:shock-greater', type: 'electricity' },
  { slug: 'rune:thundering', type: 'sonic' },
  { slug: 'rune:thundering-greater', type: 'sonic' },
];

/** The rules an energy rune is expected to carry. */
function expectedRules({ type, persistent }: EnergyRune): readonly object[] {
  const extra = { key: 'DamageDice', selectors: [ETCHED_DAMAGE], damageType: type };
  const persistentDice =
    persistent === undefined
      ? []
      : [{ ...extra, diceNumber: persistent, dieSize: 'd10', category: 'persistent', critical: true }];
  return [{ ...extra, diceNumber: 1, dieSize: 'd6' }, ...persistentDice];
}

/** Every rune in the committed packs. */
async function loadRunes(): Promise<readonly ContentEntry[]> {
  const files = await Array.fromAsync(new Bun.Glob('*/rune.json').scan(PACKS_DIR));
  const packs = await Promise.all(
    files.map(async (file): Promise<readonly ContentEntry[]> => {
      const json: unknown = await Bun.file(`${PACKS_DIR}/${file}`).json();
      return ContentEntryFile.parse(json);
    }),
  );
  return packs.flat().filter((entry) => entry.kind === ContentKind.Rune);
}

/** Whether a rune is a weapon property rune with no activation (those belong to the activations story). */
function isPlainWeaponProperty(entry: ContentEntry): boolean {
  return (
    entry.kind === ContentKind.Rune &&
    entry.data.type === 'property' &&
    entry.data.etchedOnto.item === 'weapon' &&
    entry.data.activations === undefined
  );
}

const RUNES = await loadRunes();

/** Plain weapon property runes with neither rules nor a recorded gap. */
const UNACCOUNTED = RUNES.filter((entry) => isPlainWeaponProperty(entry))
  .filter((entry) => entry.rules.length === 0 && !RECORDED_GAPS.has(entry.slug))
  .map((entry) => entry.slug);

/** Recorded gaps whose rune is gone or has since got rules. */
const STALE_GAPS = [...RECORDED_GAPS].filter((slug) => {
  const rune = RUNES.find((entry) => entry.slug === slug);
  return rune === undefined || rune.rules.length > 0;
});

describe('weapon property rune rules', () => {
  test('every rune without an activation has rules or a recorded gap', () => {
    expect(UNACCOUNTED).toEqual([]);
  });

  test('a recorded gap names a rune that still has no rules', () => {
    expect(STALE_GAPS).toEqual([]);
  });

  test.each(ENERGY_RUNES)('$slug adds its energy damage to the weapon it is etched on', (rune) => {
    const entry = RUNES.find(({ slug }) => slug === rune.slug);

    expect(entry?.rules).toMatchObject(expectedRules(rune));
  });
});
