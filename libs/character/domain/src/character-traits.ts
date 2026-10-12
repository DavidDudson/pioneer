import type { GrantResolution } from '@pioneer/rules/grants';
import { Trait } from '@pioneer/rules/sdk';

/** Where each of the character's traits is written: `self:trait:humanoid` (ADR-0048). */
const TRAIT_PREFIX = 'self:trait:';

/**
 * The character's traits, in code-unit order: its ancestry's, with those `ActorTraits` elements add and without those
 * they remove (a cleric's holy trait, a versatile heritage's), as the grants' facts say them.
 */
export function characterTraits({ rollOptions }: GrantResolution): readonly Trait[] {
  return rollOptions.flatMap((option) =>
    option.startsWith(TRAIT_PREFIX) ? [Trait.parse(option.slice(TRAIT_PREFIX.length))] : [],
  );
}
