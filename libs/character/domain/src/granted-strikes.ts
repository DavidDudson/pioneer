import type { WeaponInputs } from '@pioneer/rules/engine';
import type { GrantResolution } from '@pioneer/rules/grants';
import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import { BaseWeapon, RuleElementKey, Slug, Trait, WeaponCategory } from '@pioneer/rules/sdk';

/** A fist's base, which a deity may favour (Irori's). */
const FIST = BaseWeapon.parse('fist');

/** A fist's traits, as Foundry pf2e's `Strike` gives its fist. */
const FIST_TRAITS: readonly Trait[] = ['agile', 'finesse', 'nonlethal'].map((trait) => Trait.parse(trait));

/**
 * The Strikes the character's grants give (ADR-0047): a fist for each `Strike` element in its fist form whose predicate
 * holds, once however many give one, with the origin of the first. A favoured weapon when the deity favours the fist.
 */
export function grantedStrikes(
  { items, facts }: GrantResolution,
  favored: ReadonlySet<BaseWeapon>,
): readonly WeaponInputs[] {
  const giver = items.find(({ entry }) =>
    entry.rules.some(
      (element) =>
        element.key === RuleElementKey.Strike &&
        (element.predicate === undefined || evaluatePredicate(element.predicate, facts) === Truth.True),
    ),
  );
  if (giver === undefined) {
    return [];
  }
  return [
    {
      slug: Slug.parse(FIST),
      category: WeaponCategory.Unarmed,
      traits: FIST_TRAITS,
      favored: favored.has(FIST),
      origin: giver.origin,
    },
  ];
}
