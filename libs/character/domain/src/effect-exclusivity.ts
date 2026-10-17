import type { ContentLookup } from '@pioneer/rules/grants';
import { RollOption, Trait } from '@pioneer/rules/sdk';

import type { ActiveEffect } from './effects';

/** The trait that makes effects exclusive: a polymorph spell or feature replaces the one before it. */
const POLYMORPH = Trait.parse('polymorph');

const POLYMORPH_OPTION = RollOption.parse(`trait:${POLYMORPH}`);

/** The effects in force, and the ones a newer polymorph effect replaced. */
export interface ExclusiveEffects {
  /** In the order applied, without the replaced. */
  readonly active: readonly ActiveEffect[];
  /** The polymorph effects that lost to a newer one, oldest first, so play can end them. */
  readonly replaced: readonly ActiveEffect[];
}

/** Whether the effect's content carries the polymorph trait; an effect the content lacks does not. */
export function isPolymorph(lookup: ContentLookup, effect: ActiveEffect): boolean {
  return lookup.entry(effect.effect)?.rollOptions.includes(POLYMORPH_OPTION) === true;
}

/**
 * `effects` with at most one polymorph effect: the newest, which is the last one applied. The rest are `replaced` and
 * leave the effective set, so their rules grant nothing; every other effect stays.
 */
export function exclusiveEffects(effects: readonly ActiveEffect[], lookup: ContentLookup): ExclusiveEffects {
  const polymorphs = effects.filter((each) => isPolymorph(lookup, each));
  const replaced = polymorphs.slice(0, -1);
  return { active: effects.filter((each) => !replaced.includes(each)), replaced };
}
