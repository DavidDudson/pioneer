import { deriveStrikes, EngineMessage } from '@pioneer/rules/engine';
import type { StatisticValue, Strike, WeaponInputs } from '@pioneer/rules/engine';
import { TextPosition } from '@pioneer/rules/formula';
import {
  ContentId,
  contentId,
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

import type { NamedStrike } from '../strikes/strikes.component';
import { origin, statistic, term } from './breakdown-fixtures';

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
  { name: 'Longsword', strike: strikeOf(0) },
  { name: 'Dagger', strike: strikeOf(1) },
];

const FAILED_ATTACK = {
  ok: false,
  selector: Selector.parse('strike:longsword'),
  error: message(EngineMessage.NoClass),
  position: TextPosition.parse(1),
} as const;

/** A Strike whose attack the engine could not derive: marked failed, with why. */
export const FAILED_STRIKE: readonly NamedStrike[] = [
  { name: 'Longsword', strike: { ...strikeOf(0), attack: FAILED_ATTACK } },
];

/** A weapon that rolls no damage says so. */
export const NO_DAMAGE_STRIKE: readonly NamedStrike[] = [{ name: 'Glue bomb', strike: strikeOf(2) }];
