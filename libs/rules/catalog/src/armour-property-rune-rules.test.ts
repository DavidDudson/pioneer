import { describe, expect, test } from 'bun:test';

import { RUNES, staleGaps, unaccounted } from './property-rune-gaps';

/**
 * Armour property runes with no activation and no rules in the pack, each with why: a new book's rune must get rules
 * or be listed here with a reason. Remove an entry when its rules land. The energy-resistant runes are built from the
 * etched energy (`chosenRuneRules`), so their `rules` stay empty.
 */
const ARMOUR_GAPS: ReadonlyMap<string, string> = new Map([
  [
    'rune:aim-aiding',
    'stops the wearer giving cover to allies: ADR-0018 leaves other creatures and cover to Foundry, so the app builds no model of them (not planned)',
  ],
  ['rune:assisting', 'supports and prostheses chosen on investing: a choice with no statistic to change'],
  ['rune:energy-resistant', 'the engine builds its resistance from the etched energy (`chosenRuneRules`)'],
  ['rune:energy-resistant-greater', 'the engine builds its resistance from the etched energy (`chosenRuneRules`)'],
  [
    'rune:unnerving',
    'a penalty on the attacker: ADR-0018 leaves other creatures to Foundry, so no rule reaches it (not planned)',
  ],
]);

const ARMOUR_GAP_SLUGS: ReadonlySet<string> = new Set(ARMOUR_GAPS.keys());

interface BonusRune {
  readonly slug: string;
  readonly selector: string;
  readonly bonus: number;
  /** The actions the bonus is limited to. */
  readonly actions?: ReadonlyArray<string>;
}

/** The armour runes that give an item bonus: to a skill, a Speed or every save. */
const BONUS_RUNES: ReadonlyArray<BonusRune> = [
  { slug: 'rune:soaring', selector: 'fly-speed', bonus: 10 },
  { slug: 'rune:mobile', selector: 'step-distance', bonus: 5 },
  { slug: 'rune:mythic-resilient', selector: 'saving-throw', bonus: 4 },
  { slug: 'rune:shadow', selector: 'skill:stealth', bonus: 1 },
  { slug: 'rune:shadow-greater', selector: 'skill:stealth', bonus: 2 },
  { slug: 'rune:shadow-major', selector: 'skill:stealth', bonus: 3 },
  { slug: 'rune:slick', selector: 'skill:acrobatics', bonus: 1, actions: ['action:escape', 'action:squeeze'] },
  { slug: 'rune:slick-greater', selector: 'skill:acrobatics', bonus: 2, actions: ['action:escape', 'action:squeeze'] },
  { slug: 'rune:slick-major', selector: 'skill:acrobatics', bonus: 3, actions: ['action:escape', 'action:squeeze'] },
];

/** The flat check DCs each quenching grade gives persistent acid and fire: unassisted, then assisted (true quenching has none: assistance ends it). */
const QUENCHING_DCS: ReadonlyArray<readonly [string, number, number]> = [
  ['rune:quenching', 12, 7],
  ['rune:quenching-greater', 10, 5],
  ['rune:quenching-major', 8, 3],
];

/** The flat check DC of each fortification grade, which the wearer rolls when a critical hit lands on their AC. */
const FORTIFICATION_DCS: ReadonlyArray<readonly [string, number]> = [
  ['rune:fortification', 17],
  ['rune:fortification-greater', 14],
];

/** The rule an armour bonus rune is expected to carry. */
function expectedBonus({ selector, bonus, actions }: BonusRune): object {
  const rule = { key: 'FlatModifier', selectors: [selector], type: 'item', value: bonus };

  return actions === undefined ? rule : { ...rule, predicate: [{ or: actions }] };
}

interface ActivationRune {
  readonly slug: string;
  readonly activation: string;
  readonly name: string;
  readonly cost: string;
}

/** The armour runes whose only mechanic is an activation the content lists with a cost and no frequency. */
const ACTIVATION_RUNES: ReadonlyArray<ActivationRune> = [
  { slug: 'rune:advancing', activation: 'advancing', name: 'Advancing', cost: 'free' },
  { slug: 'rune:advancing-greater', activation: 'advancing-greater', name: 'Advancing (Greater)', cost: 'free' },
  { slug: 'rune:gliding', activation: 'gliding', name: 'Gliding', cost: 'one' },
  { slug: 'rune:portable', activation: 'portable', name: 'Portable', cost: 'three' },
  { slug: 'rune:raiment', activation: 'costume-change', name: 'Costume Change', cost: 'one' },
  { slug: 'rune:malleable', activation: 'reconfigure-armor', name: 'Reconfigure Armor', cost: 'one' },
  { slug: 'rune:swallow-spike', activation: 'swallow-spike', name: 'Swallow-Spike', cost: 'reaction' },
  {
    slug: 'rune:swallow-spike-greater',
    activation: 'swallow-spike-greater',
    name: 'Swallow-Spike (Greater)',
    cost: 'reaction',
  },
  {
    slug: 'rune:swallow-spike-major',
    activation: 'swallow-spike-major',
    name: 'Swallow-Spike (Major)',
    cost: 'reaction',
  },
  { slug: 'rune:winged-greater', activation: 'take-to-the-skies', name: 'Take to the Skies', cost: 'two' },
];

const MOONWEAVE_HEALING: ReadonlyArray<readonly [string, number]> = [
  ['rune:moonweave', 2],
  ['rune:moonweave-greater', 5],
  ['rune:moonweave-major', 10],
];

describe('armour property rune rules', () => {
  test('every recorded armour gap says why', () => {
    const unexplained = ARMOUR_GAPS.entries()
      .filter(([, reason]) => reason.trim() === '')
      .map(([slug]) => slug)
      .toArray();

    expect(unexplained).toEqual([]);
  });

  test('every rune without an activation has rules or a recorded gap', () => {
    expect(unaccounted('armor', ARMOUR_GAP_SLUGS)).toEqual([]);
  });

  test('a recorded gap names a rune that still has no rules', () => {
    expect(staleGaps(ARMOUR_GAP_SLUGS)).toEqual([]);
  });

  test.each(BONUS_RUNES)('$slug gives +$bonus to $selector', (rune) => {
    const entry = RUNES.find(({ slug }) => slug === rune.slug);

    expect(entry?.rules).toMatchObject([expectedBonus(rune)]);
  });

  test.each(QUENCHING_DCS)(
    '%s lowers the persistent acid and fire flat check to DC %i, %i assisted',
    (slug, dc, assistedDc) => {
      const entry = RUNES.find((rune) => rune.slug === slug);

      expect(entry?.rules).toMatchObject([
        { key: 'PersistentFlatCheck', damageTypes: ['acid', 'fire'], dc, assistedDc },
      ]);
    },
  );

  test('true quenching lowers the flat check to DC 5 and has assistance end the damage', () => {
    const entry = RUNES.find((rune) => rune.slug === 'rune:quenching-true');

    expect(entry?.rules).toMatchObject([{ key: 'PersistentFlatCheck', damageTypes: ['acid', 'fire'], dc: 5 }]);
    expect(entry?.rules[0]).not.toHaveProperty('assistedDc');
  });

  test('self-sealing gives resistance 10 to environmental damage while sealed, a toggle the wearer sets', () => {
    const entry = RUNES.find((rune) => rune.slug === 'rune:self-sealing');

    expect(entry?.rules).toMatchObject([
      { key: 'RollOption', option: 'option:self-sealing-sealed', toggleable: true },
      { key: 'Resistance', type: ['environmental'], value: 10, predicate: ['option:self-sealing-sealed'] },
    ]);
  });

  test.each(FORTIFICATION_DCS)('%s asks a flat check against DC %i when a critical hit lands on AC', (slug, dc) => {
    const entry = RUNES.find((rune) => rune.slug === slug);

    expect(entry?.rules).toMatchObject([{ key: 'CriticalHitCheck', selectors: ['ac'], dc }]);
  });

  test.each(MOONWEAVE_HEALING)('%s adds %i Hit Points to the first healing from a spell or effect', (slug, amount) => {
    const entry = RUNES.find((rune) => rune.slug === slug);

    expect(entry?.rules).toMatchObject([{ key: 'HealingBonus', value: amount }]);
  });

  test('spellwatch offers a new save against one hostile spell at the start of each turn', () => {
    const entry = RUNES.find((rune) => rune.slug === 'rune:spellwatch');

    expect(entry?.rules).toMatchObject([{ key: 'TurnStartSave', against: 'hostile-spell' }]);
  });

  test.each(ACTIVATION_RUNES)('$slug lists its activation with a cost and no frequency', (rune) => {
    const entry = RUNES.find(({ slug }) => slug === rune.slug);

    expect(entry?.data).toStrictEqual(
      expect.objectContaining({
        activations: [{ slug: rune.activation, name: rune.name, cost: rune.cost }],
      }),
    );
  });
});
