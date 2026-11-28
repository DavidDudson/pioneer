import { alterItem, NO_MODIFIERS } from '@pioneer/rules/engine';
import type { ModifierInputs, WeaponInputs } from '@pioneer/rules/engine';
import type { GrantResolution } from '@pioneer/rules/grants';
import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import {
  BaseWeapon,
  DamageType,
  DieSize,
  NumericItemProperty,
  RollOptionTail,
  RuleElementKey,
  Slug,
  Trait,
  WeaponCategory,
  WeaponDamage,
} from '@pioneer/rules/sdk';
import type { Origin, StrikeElement } from '@pioneer/rules/sdk';

import { gradeOf } from './item-alteration-inputs';

/** A fist's base, which a deity may favour (Irori's). */
const FIST = BaseWeapon.parse('fist');

/** A fist's traits, as Foundry pf2e's `Strike` gives its fist. */
const FIST_TRAITS: ReadonlyArray<Trait> = ['agile', 'finesse', 'nonlethal'].map((trait) => Trait.parse(trait));

/** A fist's damage, as Foundry pf2e's `Strike` gives its fist: 1d4 bludgeoning. */
const FIST_DAMAGE: WeaponDamage = WeaponDamage.parse({ dice: 1, die: DieSize.D4, damageType: DamageType.Bludgeoning });

/** A Strike element in play and where it came from. */
interface GivenStrike {
  readonly element: StrikeElement;
  readonly origin: Origin;
}

function fistStrike(origin: Origin, favored: ReadonlySet<BaseWeapon>): WeaponInputs {
  return {
    slug: Slug.parse(FIST),
    category: WeaponCategory.Unarmed,
    traits: FIST_TRAITS,
    damage: FIST_DAMAGE,
    favored: favored.has(FIST),
    origin,
  };
}

/** The attack an element of its own gives; undefined while it lacks what makes one (the schema rules that out). */
function ownStrike({ element, origin }: GivenStrike): WeaponInputs | undefined {
  const { slug, category, damage, traits = [], range, display } = element;

  return slug === undefined || category === undefined
    ? undefined
    : { slug, category, traits, range, damage, label: display?.label, origin };
}

/** The roll options of a granted Strike, as a held weapon's are, so an alteration of weapons reaches it. */
function strikeRollOptions({ category, range, traits }: WeaponInputs): ReadonlyArray<RollOptionTail> {
  return [
    'type:weapon',
    `category:${category}`,
    range === undefined ? 'melee' : 'ranged',
    ...(category === WeaponCategory.Unarmed ? ['unarmed'] : []),
    ...traits.map((trait) => `trait:${trait}`),
    'equipped',
  ].map((option) => RollOptionTail.parse(option));
}

/** `strike` with the potency and striking grades the `ItemAlteration` elements in play give it (Automatic Bonus Progression). */
function altered(strike: WeaponInputs, rules: ModifierInputs): WeaponInputs {
  const item = alterItem(rules, {
    rollOptions: strikeRollOptions(strike),
    numbers: new Map(),
    traits: strike.traits,
    damageType: undefined,
    materials: [],
    propertyRunes: [],
  });

  return {
    ...strike,
    potency: gradeOf(item, NumericItemProperty.Potency),
    striking: gradeOf(item, NumericItemProperty.Striking),
  };
}

/**
 * The Strikes the character's grants give (ADR-0048): a fist for each `Strike` element in its fist form whose predicate
 * holds, once however many give one, with the origin of the first the grants list, and an attack of its own for each
 * element that defines one, the first of a slug winning. A favoured weapon when the deity favours the fist. Each goes
 * through the `ItemAlteration` elements of `rules`.
 */
export function grantedStrikes(
  { items, facts }: GrantResolution,
  favored: ReadonlySet<BaseWeapon>,
  rules: () => ModifierInputs = () => NO_MODIFIERS,
): ReadonlyArray<WeaponInputs> {
  const given = items.flatMap(({ entry, origin }): Array<GivenStrike> =>
    entry.rules.flatMap((element) =>
      element.key === RuleElementKey.Strike &&
      (element.predicate === undefined || evaluatePredicate(element.predicate, facts) === Truth.True)
        ? [{ element, origin }]
        : [],
    ),
  );

  const fist = given.find(({ element }) => element.fist === true);
  const own = given.flatMap((strike) => ownStrike(strike) ?? []);
  const taken = new Set<Slug>();

  const strikes = [...(fist === undefined ? [] : [fistStrike(fist.origin, favored)]), ...own].filter(({ slug }) => {
    const fresh = !taken.has(slug);
    taken.add(slug);

    return fresh;
  });

  if (strikes.length === 0) {
    return strikes;
  }

  const inPlay = rules();

  return strikes.map((strike) => altered(strike, inPlay));
}
