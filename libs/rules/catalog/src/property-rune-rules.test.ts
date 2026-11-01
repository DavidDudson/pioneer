import { describe, expect, test } from 'bun:test';

import { ContentEntryFile, ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

const PACKS_DIR = `${import.meta.dir}/../../../../content/packs`;
const ETCHED_DAMAGE = 'etched-damage';

/**
 * Weapon property runes with no activation and no rules yet: each needs an engine gap closed first (a critical
 * effect, a trait or property the Strike has no way to take, a condition on the target). Remove a slug when its rules
 * land; a new book's rune must get rules or be listed here.
 *
 * Why the weapon-changing runes stay here: keen needs a critical range the Strike has no concept of; quickstrike grants
 * a conditional action; returning, extending and shifting are activations or movement the sheet does not model; the
 * rooting family is a critical-hit effect on the target (a condition it can't yet apply).
 *
 * Why the target-dependent runes stay here: bane and energy vulnerability name a creature type or energy the crafter
 * or wielder picks; astral, decaying, fearsome, impactful, merciful and pacifying give a save, a push, a condition or
 * a lethality rule the Strike cannot apply to a target; spell reservoir, coating, conducting, animated and authorized
 * are activations or item state; underwater changes a penalty no roll here reads; the mythic runes need the mythic
 * rules.
 */
const WEAPON_GAPS: ReadonlySet<string> = new Set([
  'rune:animated',
  'rune:astral',
  'rune:astral-greater',
  'rune:authorized',
  'rune:bane',
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
  'rune:vorpal',
]);

interface EnergyRune {
  readonly slug: string;
  readonly type: string;
  /** Dice of persistent damage added on a critical hit. */
  readonly persistent?: number;
}

/** The extra damage each energy rune adds: one `d6` of its type, and the persistent dice on a critical hit. Greater grades ignore resistance. */
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
function expectedRules({ slug, type, persistent }: EnergyRune): readonly object[] {
  const ignores = slug.endsWith('-greater') ? { ignoreResistance: true } : {};
  const extra = { key: 'DamageDice', selectors: [ETCHED_DAMAGE], damageType: type, ...ignores };
  const persistentDice =
    persistent === undefined
      ? []
      : [{ ...extra, diceNumber: persistent, dieSize: 'd10', category: 'persistent', critical: true }];
  const critical = slug.startsWith('rune:flaming')
    ? []
    : [{ key: 'Note', selectors: [ETCHED_DAMAGE], outcome: ['criticalSuccess'] }];
  return [{ ...extra, diceNumber: 1, dieSize: 'd6' }, ...persistentDice, ...critical];
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

const ARMOUR_GAPS: ReadonlySet<string> = new Set([
  'rune:advancing',
  'rune:advancing-greater',
  'rune:aim-aiding',
  'rune:assisting',
  'rune:energy-resistant',
  'rune:energy-resistant-greater',
  'rune:fortification',
  'rune:fortification-greater',
  'rune:gliding',
  'rune:malleable',
  'rune:mobile',
  'rune:moonweave',
  'rune:moonweave-greater',
  'rune:moonweave-major',
  'rune:mythic-armor-potency',
  'rune:mythic-resilient',
  'rune:portable',
  'rune:quenching',
  'rune:quenching-greater',
  'rune:quenching-major',
  'rune:quenching-true',
  'rune:raiment',
  'rune:ready',
  'rune:ready-greater',
  'rune:self-sealing',
  'rune:spellwatch',
  'rune:swallow-spike',
  'rune:swallow-spike-greater',
  'rune:swallow-spike-major',
  'rune:unnerving',
  'rune:winged-greater',
]);

interface BonusRune {
  readonly slug: string;
  readonly selector: string;
  readonly bonus: number;
  /** The actions the bonus is limited to. */
  readonly actions?: readonly string[];
}

/** The armour runes that give an item bonus: to a skill, or to a Speed. */
const BONUS_RUNES: readonly BonusRune[] = [
  { slug: 'rune:soaring', selector: 'fly-speed', bonus: 10 },
  { slug: 'rune:shadow', selector: 'skill:stealth', bonus: 1 },
  { slug: 'rune:shadow-greater', selector: 'skill:stealth', bonus: 2 },
  { slug: 'rune:shadow-major', selector: 'skill:stealth', bonus: 3 },
  { slug: 'rune:slick', selector: 'skill:acrobatics', bonus: 1, actions: ['action:escape', 'action:squeeze'] },
  { slug: 'rune:slick-greater', selector: 'skill:acrobatics', bonus: 2, actions: ['action:escape', 'action:squeeze'] },
  { slug: 'rune:slick-major', selector: 'skill:acrobatics', bonus: 3, actions: ['action:escape', 'action:squeeze'] },
];

/** The rule an armour bonus rune is expected to carry. */
function expectedBonus({ selector, bonus, actions }: BonusRune): object {
  const rule = { key: 'FlatModifier', selectors: [selector], type: 'item', value: bonus };
  return actions === undefined ? rule : { ...rule, predicate: [{ or: actions }] };
}

/** Whether a rune is a property rune for `item` with no activation (those belong to the activations stories). */
function isPlainProperty(entry: ContentEntry, item: string): boolean {
  return (
    entry.kind === ContentKind.Rune &&
    entry.data.type === 'property' &&
    entry.data.etchedOnto.item === item &&
    entry.data.activations === undefined
  );
}

const RUNES = await loadRunes();

/** Plain property runes for `item` with neither rules nor a recorded gap. */
function unaccounted(item: string, gaps: ReadonlySet<string>): readonly string[] {
  return RUNES.filter((entry) => isPlainProperty(entry, item))
    .filter((entry) => entry.rules.length === 0 && !gaps.has(entry.slug))
    .map((entry) => entry.slug);
}

/** Recorded gaps whose rune is gone or has since got rules. */
function staleGaps(gaps: ReadonlySet<string>): readonly string[] {
  return [...gaps].filter((slug) => {
    const rune = RUNES.find((entry) => entry.slug === slug);
    return rune === undefined || rune.rules.length > 0;
  });
}

describe('weapon property rune rules', () => {
  test('every rune without an activation has rules or a recorded gap', () => {
    expect(unaccounted('weapon', WEAPON_GAPS)).toEqual([]);
  });

  test('a recorded gap names a rune that still has no rules', () => {
    expect(staleGaps(WEAPON_GAPS)).toEqual([]);
  });

  test.each(ENERGY_RUNES)('$slug adds its energy damage to the weapon it is etched on', (rune) => {
    const entry = RUNES.find(({ slug }) => slug === rune.slug);

    expect(entry?.rules).toMatchObject(expectedRules(rune));
  });

  test('ghost touch makes the weapon it is etched on count as having the rune', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:ghost-touch');

    expect(entry?.rules).toMatchObject([
      { key: 'AdjustStrike', property: 'property-runes', mode: 'add', value: 'ghost-touch', etched: true },
    ]);
  });

  test.each([
    { slug: 'rune:brilliant', ignoring: {} },
    { slug: 'rune:brilliant-greater', ignoring: { ignoreResistance: true } },
  ])('$slug adds fire damage, and spirit to fiends and vitality to undead', ({ slug, ignoring }) => {
    const entry = RUNES.find((rune) => rune.slug === slug);

    expect(entry?.rules).toMatchObject([
      { key: 'DamageDice', damageType: 'fire', diceNumber: 1, dieSize: 'd4', ...ignoring },
      { damageType: 'spirit', predicate: ['target:trait:fiend'], ...ignoring },
      { damageType: 'vitality', predicate: ['target:trait:undead'], ...ignoring },
    ]);
  });

  test.each([
    { slug: 'rune:vitalizing', dice: 1 },
    { slug: 'rune:vitalizing-greater', dice: 2 },
  ])('$slug adds persistent vitality damage to undead, with a critical hit note', ({ slug, dice }) => {
    const entry = RUNES.find((rune) => rune.slug === slug);

    expect(entry?.rules).toMatchObject([
      {
        key: 'DamageDice',
        diceNumber: dice,
        dieSize: 'd6',
        damageType: 'vitality',
        category: 'persistent',
        predicate: ['target:trait:undead'],
      },
      { key: 'Note', outcome: ['criticalSuccess'], predicate: ['target:trait:undead'] },
    ]);
  });

  test('wounding adds persistent bleed damage on a hit', () => {
    const entry = RUNES.find(({ slug }) => slug === 'rune:wounding');

    expect(entry?.rules).toMatchObject([
      {
        key: 'DamageDice',
        selectors: [ETCHED_DAMAGE],
        diceNumber: 1,
        dieSize: 'd6',
        damageType: 'bleed',
        category: 'persistent',
      },
    ]);
  });
});

describe('armour property rune rules', () => {
  test('every rune without an activation has rules or a recorded gap', () => {
    expect(unaccounted('armor', ARMOUR_GAPS)).toEqual([]);
  });

  test('a recorded gap names a rune that still has no rules', () => {
    expect(staleGaps(ARMOUR_GAPS)).toEqual([]);
  });

  test.each(BONUS_RUNES)('$slug gives +$bonus to $selector', (rune) => {
    const entry = RUNES.find(({ slug }) => slug === rune.slug);

    expect(entry?.rules).toMatchObject([expectedBonus(rune)]);
  });
});
