import type { WeaponInputs } from '@pioneer/rules/engine';
import type { GrantResolution } from '@pioneer/rules/grants';
import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import {
  BaseWeapon,
  DamageType,
  DieSize,
  RuleElementKey,
  Slug,
  Trait,
  WeaponCategory,
  WeaponDamage,
} from '@pioneer/rules/sdk';
import type { Origin, StrikeElement } from '@pioneer/rules/sdk';

/** A fist's base, which a deity may favour (Irori's). */
const FIST = BaseWeapon.parse('fist');

/** A fist's traits, as Foundry pf2e's `Strike` gives its fist. */
const FIST_TRAITS: readonly Trait[] = ['agile', 'finesse', 'nonlethal'].map((trait) => Trait.parse(trait));

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

/**
 * The Strikes the character's grants give (ADR-0048): a fist for each `Strike` element in its fist form whose predicate
 * holds, once however many give one, with the origin of the first the grants list, and an attack of its own for each
 * element that defines one, the first of a slug winning. A favoured weapon when the deity favours the fist.
 */
export function grantedStrikes(
  { items, facts }: GrantResolution,
  favored: ReadonlySet<BaseWeapon>,
): readonly WeaponInputs[] {
  const given = items.flatMap(({ entry, origin }): GivenStrike[] =>
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
  return [...(fist === undefined ? [] : [fistStrike(fist.origin, favored)]), ...own].filter(({ slug }) => {
    const fresh = !taken.has(slug);
    taken.add(slug);
    return fresh;
  });
}
