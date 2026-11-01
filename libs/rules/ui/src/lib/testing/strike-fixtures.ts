import { deriveStrikes, EngineMessage, LineStatusKind, NoteRoll } from '@pioneer/rules/engine';
import type { ExtraDice, RuleId, StatisticValue, Strike, StrikeDamage, WeaponInputs } from '@pioneer/rules/engine';
import { TextPosition } from '@pioneer/rules/formula';
import {
  ContentId,
  contentId,
  ContentText,
  DamageAmount,
  DiceCount,
  EntrySlug,
  Feet,
  ItemCount,
  ModifierType,
  PackId,
  RichText,
  RuneGrade,
  Selector,
  Slug,
  Trait,
  WeaponCategory,
  WeaponDamage,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { NamedStrike, StrikesShield } from '../strikes/strikes.component';
import { GLOOM_WALKER, IN_DARKNESS, line, origin, ruleId, statistic, term } from './breakdown-fixtures';

const PLAYER_CORE = PackId.parse('player-core');
const STRENGTH = 4;
const EXPERT_AT_FIRST = 5;
const LONGSWORD_DAMAGE = 4;
const STRIKING = RuneGrade.parse(1);

/** A weapon of the fixtures: martial, in the Player Core pack, with the traits and damage it names. */
interface FixtureWeapon {
  readonly slug: string;
  readonly traits: readonly string[];
  readonly damage: object;
  readonly striking?: RuneGrade;
  readonly splash?: number;
  readonly range?: number;
  readonly quantity?: number;
}

function weapon({ slug, traits, damage, striking, splash, range, quantity }: FixtureWeapon): WeaponInputs {
  const entry = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse(`weapon:${slug}`)));
  return {
    slug: Slug.parse(slug),
    category: WeaponCategory.Martial,
    traits: traits.map((trait) => Trait.parse(trait)),
    damage: WeaponDamage.parse(damage),
    striking,
    splash: splash === undefined ? undefined : DamageAmount.parse(splash),
    range: range === undefined ? undefined : Feet.parse(range),
    quantity: quantity === undefined ? undefined : ItemCount.parse(quantity),
    origin: origin(entry),
  };
}

/** A weapon's attack (Strength and expert) and its flat damage, as the engine derives them. */
function results(slug: string, damageBonus: number): ReadonlyMap<Selector, StatisticValue> {
  const attack = `strike:${slug}`;
  const damage = `strike-damage:${slug}`;
  const attackTerms = [term('@weapon.attr', STRENGTH), term('@weapon.prof', EXPERT_AT_FIRST)];
  return new Map([
    [Selector.parse(attack), statistic(attack, { base: attackTerms })],
    [Selector.parse(damage), statistic(damage, { base: [term('@weapon.damage', damageBonus)] })],
  ]);
}

const WEAPONS: readonly WeaponInputs[] = [
  weapon({ slug: 'longsword', traits: [], damage: { dice: 1, die: 'd8', damageType: 'slashing' } }),
  weapon({
    slug: 'dagger',
    traits: ['agile', 'finesse'],
    damage: { dice: 1, die: 'd4', damageType: 'piercing' },
    striking: STRIKING,
  }),
  weapon({ slug: 'glue-bomb', traits: [], damage: { dice: 0, damageType: 'bludgeoning' } }),
  weapon({
    slug: 'alchemists-fire',
    traits: ['bomb', 'consumable', 'splash'],
    damage: { dice: 1, die: 'd8', damageType: 'fire', persistent: { formula: '1', damageType: 'fire' } },
    splash: 1,
    range: 20,
    quantity: 3,
  }),
  weapon({
    slug: 'holy-water',
    traits: ['consumable', 'splash', 'thrown'],
    damage: { dice: 1, die: 'd6', damageType: 'spirit' },
    splash: 1,
    range: 20,
    quantity: 1,
  }),
];

const DERIVED = deriveStrikes(
  WEAPONS,
  new Map([
    ...results('longsword', LONGSWORD_DAMAGE),
    ...results('dagger', 0),
    ...results('glue-bomb', 0),
    ...results('alchemists-fire', 0),
    ...results('holy-water', 0),
  ]),
);

function strikeOf(index: number): Strike {
  const strike = DERIVED[index];
  if (strike === undefined) {
    throw new Error(`No Strike fixture at ${index}`);
  }
  return strike;
}

/** A longsword, and an agile dagger with a striking rune: 1d8+4 slashing; 2d4 piercing, and the smaller penalty. */
export const FIGHTER_STRIKES: readonly NamedStrike[] = [
  { name: 'Longsword', traits: [], strike: strikeOf(0) },
  { name: 'Dagger', traits: ['Agile', 'Finesse'], strike: strikeOf(1) },
];

const FAILED_ATTACK = {
  ok: false,
  selector: Selector.parse('strike:longsword'),
  error: message(EngineMessage.NoClass),
  position: TextPosition.parse(1),
} as const;

/** A Strike whose attack the engine could not derive: marked failed, with why. */
export const FAILED_STRIKE: readonly NamedStrike[] = [
  { name: 'Longsword', traits: [], strike: { ...strikeOf(0), attack: FAILED_ATTACK } },
];

const LONGSWORD_DAMAGE_ROLL = {
  dice: DiceCount.parse(1),
  die: 'd8',
  damageType: 'slashing',
  extra: [],
  persistent: undefined,
  splash: undefined,
} as const;
const DARKNESS_ATTACK_BONUS = 1;
const DARKNESS_DAMAGE_BONUS = 2;

/** A longsword whose attack and flat damage each carry a line that holds only in darkness. */
export const CONDITIONAL_STRIKE: readonly NamedStrike[] = [
  {
    name: 'Longsword',
    traits: [],
    strike: {
      ...strikeOf(0),
      attack: statistic('strike:longsword', {
        base: [term('@weapon.attr', STRENGTH), term('@weapon.prof', EXPERT_AT_FIRST)],
        lines: [
          line(GLOOM_WALKER, { type: ModifierType.Circumstance, value: DARKNESS_ATTACK_BONUS, status: IN_DARKNESS }),
        ],
      }),
      damage: {
        ...LONGSWORD_DAMAGE_ROLL,
        bonus: statistic('strike-damage:longsword', {
          base: [term('@weapon.damage', LONGSWORD_DAMAGE)],
          lines: [line(GLOOM_WALKER, { type: ModifierType.Status, value: DARKNESS_DAMAGE_BONUS, status: IN_DARKNESS })],
        }),
      },
    },
  },
];

/** A weapon that rolls no damage says so. */
export const NO_DAMAGE_STRIKE: readonly NamedStrike[] = [{ name: 'Glue bomb', traits: [], strike: strikeOf(2) }];

const FIRE_AT = 3;
const WATER_AT = 4;

/** Thrown consumables: a stack of 3 alchemist's fire with persistent damage and splash, and one holy water. */
export const THROWN_STRIKES: readonly NamedStrike[] = [
  { name: "Alchemist's fire", traits: ['Bomb', 'Consumable', 'Splash'], strike: strikeOf(FIRE_AT) },
  { name: 'Holy water', traits: ['Consumable', 'Splash', 'Thrown'], strike: strikeOf(WATER_AT) },
];

/** A steel shield held beside the weapons. */
export const STEEL_SHIELD: StrikesShield = { name: 'Steel Shield', hardness: 5, hitPoints: 20, brokenThreshold: 10 };

/** The rule of the attack line `claimableStrike` offers to claim: Gloom Walker, while you are in darkness. */
export const DARKNESS_RULE: RuleId = ruleId(GLOOM_WALKER);

const DARKNESS_LINE = line(GLOOM_WALKER, {
  type: ModifierType.Circumstance,
  value: DARKNESS_ATTACK_BONUS,
  status: IN_DARKNESS,
});

/**
 * A longsword whose attack offers Gloom Walker's situation for claiming, as the sheet derives it: with it claimed the
 * line applies and the attack is +1.
 */
export function claimableStrike(claimed: boolean): readonly NamedStrike[] {
  const applied = { ...DARKNESS_LINE, status: { kind: LineStatusKind.Applied } } as const;
  return [
    {
      name: 'Longsword',
      traits: [],
      strike: {
        ...strikeOf(0),
        attack: statistic('strike:longsword', {
          base: [term('@weapon.attr', STRENGTH), term('@weapon.prof', EXPERT_AT_FIRST)],
          lines: [claimed ? applied : DARKNESS_LINE],
        }),
      },
      situations: { offered: [DARKNESS_LINE], claimed: new Set(claimed ? [DARKNESS_RULE] : []) },
    },
  ];
}

const FLAME_DICE: ExtraDice = {
  count: DiceCount.parse(1),
  die: 'd6',
  damageType: 'fire',
  category: 'precision',
  critical: false,
  ignoresResistance: false,
  origin: origin(GLOOM_WALKER),
};

/** A longsword with a precision die of fire damage, a critical-hit-only die of cold, and notes on each roll. */
export const ELEMENT_STRIKE: readonly NamedStrike[] = [
  {
    name: 'Longsword',
    traits: [],
    strike: {
      ...strikeOf(0),
      damage: {
        ...longswordDamage(),
        extra: [FLAME_DICE, { ...FLAME_DICE, damageType: 'cold', category: undefined, critical: true }],
      },
      notes: [
        {
          roll: NoteRoll.Attack,
          title: ContentText.parse('Gloom'),
          text: RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text: 'The target is dazzled.' }] }]),
          outcome: ['criticalSuccess', 'success'],
          origin: origin(GLOOM_WALKER),
        },
        {
          roll: NoteRoll.Damage,
          title: undefined,
          text: RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text: 'The flame lingers.' }] }]),
          outcome: undefined,
          origin: origin(GLOOM_WALKER),
        },
      ],
    },
  },
];

function longswordDamage(): StrikeDamage {
  const { damage } = strikeOf(0);
  if (damage === undefined) {
    throw new Error('The longsword fixture has no damage');
  }
  return damage;
}

/** A longsword that item alterations made of cold iron, with the flaming rune and the agile trait. */
export const ALTERED_STRIKE: readonly NamedStrike[] = [
  {
    name: 'Longsword',
    traits: ['Agile'],
    strike: {
      ...strikeOf(0),
      weapon: {
        ...strikeOf(0).weapon,
        traits: [Trait.parse('agile')],
        materials: [Slug.parse('cold-iron')],
        propertyRunes: [Slug.parse('flaming')],
      },
    },
  },
];
