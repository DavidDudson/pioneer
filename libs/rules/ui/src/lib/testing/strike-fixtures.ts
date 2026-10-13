import { deriveStrikes, EngineMessage } from '@pioneer/rules/engine';
import type { StatisticValue, Strike, WeaponInputs } from '@pioneer/rules/engine';
import { TextPosition } from '@pioneer/rules/formula';
import {
  ContentId,
  contentId,
  DiceCount,
  ModifierType,
  EntrySlug,
  PackId,
  RuneGrade,
  Selector,
  Slug,
  Trait,
  WeaponCategory,
  WeaponDamage,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { NamedStrike, StrikesShield } from '../strikes/strikes.component';
import { GLOOM_WALKER, IN_DARKNESS, line, origin, statistic, term } from './breakdown-fixtures';

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
}

function weapon({ slug, traits, damage, striking }: FixtureWeapon): WeaponInputs {
  const entry = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse(`weapon:${slug}`)));
  return {
    slug: Slug.parse(slug),
    category: WeaponCategory.Martial,
    traits: traits.map((trait) => Trait.parse(trait)),
    damage: WeaponDamage.parse(damage),
    striking,
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
];

const DERIVED = deriveStrikes(
  WEAPONS,
  new Map([...results('longsword', LONGSWORD_DAMAGE), ...results('dagger', 0), ...results('glue-bomb', 0)]),
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

const LONGSWORD_DAMAGE_ROLL = { dice: DiceCount.parse(1), die: 'd8', damageType: 'slashing' } as const;
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

/** A steel shield held beside the weapons. */
export const STEEL_SHIELD: StrikesShield = { name: 'Steel Shield', hardness: 5, hitPoints: 20, brokenThreshold: 10 };
