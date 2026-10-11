import { Truth } from '@pioneer/rules/predicate';
import { RuleElementKey } from '@pioneer/rules/sdk';
import type { Origin, Slug, SpellPreparation } from '@pioneer/rules/sdk';

import type { ModifierInputs } from './rule-in-play';
import { truthOf } from './rule-value';
import type { SpellcastingInputs } from './source-inputs';

/** A spellcasting entry on the character: what its spell attack and DC read, how it casts, and why it is there. */
export interface SpellcastingInPlay extends SpellcastingInputs {
  readonly preparation: SpellPreparation;
  /** The entry whose `SpellcastingEntry` element gave it, and how that entry got on the character. */
  readonly origin: Origin;
}

/**
 * The spellcasting entries the `SpellcastingEntry` elements in play give (ADR-0037): one per slug, from the first
 * element with that slug whose predicate holds, in slug order. One that depends on the situation gives none on the
 * sheet. Each is a source `StatisticInputs.spellcasting` derives a spell attack and DC for.
 */
export function spellcastingInPlay({ rules, facts }: ModifierInputs): readonly SpellcastingInPlay[] {
  const entries = new Map<Slug, SpellcastingInPlay>();
  for (const { element, origin } of rules) {
    if (
      element.key === RuleElementKey.SpellcastingEntry &&
      !entries.has(element.slug) &&
      truthOf(element.predicate, facts) === Truth.True
    ) {
      const { slug, tradition, attribute, preparation } = element;
      entries.set(slug, { slug, tradition, attribute, preparation, origin });
    }
  }
  // Code-unit order, so the result never depends on the host's locale.
  return [...entries.values()].toSorted((left, right) => {
    if (left.slug === right.slug) {
      return 0;
    }
    return left.slug < right.slug ? -1 : 1;
  });
}
