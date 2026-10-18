import { ContentKind, RollOption } from '@pioneer/rules/sdk';
import type { ContentId, ContentLevel } from '@pioneer/rules/sdk';

import type { ChoiceContext } from './choices';
import type { ContentLookup, GrantEntry } from './grant-entry';

const SKILL_TRAIT = RollOption.parse('trait:skill');
const GENERAL_TRAIT = RollOption.parse('trait:general');
const ARCHETYPE_TRAIT = RollOption.parse('trait:archetype');
const UNIVERSAL_ANCESTRY_TRAIT = RollOption.parse('trait:universal-ancestry');
const LEVEL_PREFIX = 'level:';

/** How an archetype lists a feat as its own: the fact that the character holds its dedication, and the level it gives. */
interface Access {
  readonly dedication: RollOption;
  readonly level: ContentLevel;
}

/** Each archetype's additional feats by feat, read once per lookup: a lookup's content never changes. */
const ACCESS = new WeakMap<ContentLookup, ReadonlyMap<ContentId, readonly Access[]>>();

function readAccess(lookup: ContentLookup): ReadonlyMap<ContentId, readonly Access[]> {
  const access = new Map<ContentId, Access[]>();
  for (const { archetype } of lookup.ofKind(ContentKind.Archetype)) {
    const dedication = archetype === undefined ? undefined : lookup.entry(archetype.dedication);
    for (const { feat, level } of archetype?.additionalFeats ?? []) {
      if (dedication !== undefined) {
        const held = RollOption.parse(`feat:${dedication.slug}`);
        access.set(feat, [...(access.get(feat) ?? []), { dedication: held, level }]);
      }
    }
  }
  return access;
}

function accessTo(feat: ContentId, lookup: ContentLookup): readonly Access[] {
  const index = ACCESS.get(lookup) ?? readAccess(lookup);
  ACCESS.set(lookup, index);
  return index.get(feat) ?? [];
}

/** The trait-based additions: skill feats are general, and a Universal Ancestry feat has the character's ancestry trait. */
function traitAdditions(rollOptions: readonly RollOption[], { facts }: ChoiceContext): RollOption[] {
  const general = rollOptions.includes(SKILL_TRAIT) && !rollOptions.includes(GENERAL_TRAIT) ? [GENERAL_TRAIT] : [];
  const ancestry = rollOptions.includes(UNIVERSAL_ANCESTRY_TRAIT)
    ? facts.tails('ancestry').map((slug) => RollOption.parse(`trait:${slug}`))
    : [];
  return [...general, ...ancestry];
}

/**
 * A feat candidate's own roll options as a query reads them, with what the rules say of it beyond its envelope:
 *
 * - A skill feat is also a general feat: a general feat slot takes "any general feat (including skill feats)"
 *   (Player Core, General Feats), though Foundry's traits give only some of them `general`.
 * - A Universal Ancestry feat has the trait of the character's ancestry ("This feat gains the trait appropriate for
 *   your ancestry"), so an ancestry feat slot offers it.
 * - A feat an archetype lists under Additional Feats is an archetype feat, of the level the archetype gives it, for a
 *   character who holds that archetype's dedication.
 *
 * Any other candidate reads as its envelope says.
 */
export function candidateOptions(candidate: GrantEntry, context: ChoiceContext): readonly RollOption[] {
  const { rollOptions } = candidate;
  if (candidate.kind !== ContentKind.Feat) {
    return rollOptions;
  }
  const added = traitAdditions(rollOptions, context);
  const levels = accessTo(candidate.id, context.lookup)
    .filter(({ dedication }) => context.facts.has(dedication))
    .map(({ level }) => level);
  if (levels.length === 0) {
    return added.length === 0 ? rollOptions : [...rollOptions, ...added];
  }
  const level = RollOption.parse(`${LEVEL_PREFIX}${Math.min(...levels)}`);
  return [...rollOptions.filter((option) => !option.startsWith(LEVEL_PREFIX)), ...added, ARCHETYPE_TRAIT, level];
}
