import { describe, expect, test } from 'bun:test';

import { RUNES, staleGaps, unaccounted } from './property-rune-gaps';

/**
 * Armour property runes with no activation and no rules in the pack, each with why: a new book's rune must get rules
 * or be listed here with a reason. Remove an entry when its rules land. The energy-resistant runes are built from the
 * etched energy (`chosenRuneRules`), so their `rules` stay empty.
 */
const ARMOUR_GAPS: ReadonlyMap<string, string> = new Map([
  [
    'rune:advancing',
    'an activation with no frequency, which the content has no place for (armour activations story): a Stride after a kill',
  ],
  [
    'rune:advancing-greater',
    'an activation with no frequency, which the content has no place for (armour activations story): a Stride after a kill',
  ],
  ['rune:aim-aiding', 'stops the wearer giving cover to allies, which no cover calculation reads'],
  ['rune:assisting', 'supports and prostheses chosen on investing: a choice with no statistic to change'],
  ['rune:energy-resistant', 'the engine builds its resistance from the etched energy (`chosenRuneRules`)'],
  ['rune:energy-resistant-greater', 'the engine builds its resistance from the etched energy (`chosenRuneRules`)'],
  ['rune:gliding', 'an activation with no frequency, which the content has no place for (armour activations story)'],
  ['rune:portable', 'an activation with no frequency, which the content has no place for (armour activations story)'],
  ['rune:raiment', 'an activation with no frequency, which the content has no place for (armour activations story)'],
  ['rune:malleable', 'an activation with no frequency, which the content has no place for (armour activations story)'],
  [
    'rune:swallow-spike',
    'an activation with no frequency, which the content has no place for (armour activations story)',
  ],
  [
    'rune:swallow-spike-greater',
    'an activation with no frequency, which the content has no place for (armour activations story)',
  ],
  [
    'rune:swallow-spike-major',
    'an activation with no frequency, which the content has no place for (armour activations story)',
  ],
  [
    'rune:winged-greater',
    'an activation with no frequency, which the content has no place for (armour activations story)',
  ],
  ['rune:mobile', 'one more 5 feet on a Step each turn: the Step distance is no statistic'],
  ['rune:moonweave', 'extra Hit Points on the first heal from an effect: no healing hook reads a rule'],
  ['rune:moonweave-greater', 'extra Hit Points on the first heal from an effect: no healing hook reads a rule'],
  ['rune:moonweave-major', 'extra Hit Points on the first heal from an effect: no healing hook reads a rule'],
  ['rune:quenching', 'lowers the flat check DC against persistent acid and fire: the DC is fixed in `turn-end.ts`'],
  [
    'rune:quenching-greater',
    'lowers the flat check DC against persistent acid and fire: the DC is fixed in `turn-end.ts`',
  ],
  [
    'rune:quenching-major',
    'lowers the flat check DC against persistent acid and fire: the DC is fixed in `turn-end.ts`',
  ],
  [
    'rune:quenching-true',
    'lowers the flat check DC against persistent acid and fire: the DC is fixed in `turn-end.ts`',
  ],
  ['rune:ready', 'the actions to don armour: donning is not modelled'],
  ['rune:ready-greater', 'the actions to don armour: donning is not modelled'],
  [
    'rune:self-sealing',
    'resistance 10 to environmental damage while sealed: the seal is item state, and environmental damage is no resistance type',
  ],
  ['rune:spellwatch', 'a new save against one hostile spell each turn: no turn-start save is modelled'],
  ['rune:unnerving', 'a penalty on the attacker: no rule reaches a creature that hits the wearer'],
]);

const ARMOUR_GAP_SLUGS: ReadonlySet<string> = new Set(ARMOUR_GAPS.keys());

interface BonusRune {
  readonly slug: string;
  readonly selector: string;
  readonly bonus: number;
  /** The actions the bonus is limited to. */
  readonly actions?: readonly string[];
}

/** The armour runes that give an item bonus: to a skill, a Speed or every save. */
const BONUS_RUNES: readonly BonusRune[] = [
  { slug: 'rune:soaring', selector: 'fly-speed', bonus: 10 },
  { slug: 'rune:mythic-resilient', selector: 'saving-throw', bonus: 4 },
  { slug: 'rune:shadow', selector: 'skill:stealth', bonus: 1 },
  { slug: 'rune:shadow-greater', selector: 'skill:stealth', bonus: 2 },
  { slug: 'rune:shadow-major', selector: 'skill:stealth', bonus: 3 },
  { slug: 'rune:slick', selector: 'skill:acrobatics', bonus: 1, actions: ['action:escape', 'action:squeeze'] },
  { slug: 'rune:slick-greater', selector: 'skill:acrobatics', bonus: 2, actions: ['action:escape', 'action:squeeze'] },
  { slug: 'rune:slick-major', selector: 'skill:acrobatics', bonus: 3, actions: ['action:escape', 'action:squeeze'] },
];

/** The flat check DC of each fortification grade, which the wearer rolls when a critical hit lands on their AC. */
const FORTIFICATION_DCS: readonly (readonly [string, number])[] = [
  ['rune:fortification', 17],
  ['rune:fortification-greater', 14],
];

/** The rule an armour bonus rune is expected to carry. */
function expectedBonus({ selector, bonus, actions }: BonusRune): object {
  const rule = { key: 'FlatModifier', selectors: [selector], type: 'item', value: bonus };
  return actions === undefined ? rule : { ...rule, predicate: [{ or: actions }] };
}

describe('armour property rune rules', () => {
  test('every recorded armour gap says why', () => {
    const unexplained = [...ARMOUR_GAPS].filter(([, reason]) => reason.trim() === '').map(([slug]) => slug);

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

  test.each(FORTIFICATION_DCS)('%s asks a flat check against DC %i when a critical hit lands on AC', (slug, dc) => {
    const entry = RUNES.find((rune) => rune.slug === slug);

    expect(entry?.rules).toMatchObject([{ key: 'CriticalHitCheck', selectors: ['ac'], dc }]);
  });
});
