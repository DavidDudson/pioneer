import type { ChoiceSlot, ContentLookup, GrantResolution } from '@pioneer/rules/grants';
import { RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentText } from '@pioneer/rules/sdk';

/** A `ChoiceSet` slot that lists its options, with the name of the entry asking. */
export interface ListedChoice {
  readonly slot: ChoiceSlot;
  readonly entryName: ContentText;
}

/**
 * The character's `ChoiceSet` slots that list their options, answered or open, at the level `resolution` was read
 * at: Divine Font's font, Domain Initiate's domain, Initiate Warden's warden spell (#596, ADR-0050). A slot whose
 * options are a query of content (a feat slot, a subclass) has a picker of its own, or none yet (#466), so it is left
 * out.
 */
export function listedChoices(resolution: GrantResolution, lookup: ContentLookup): readonly ListedChoice[] {
  return (
    [...resolution.answered, ...resolution.open]
      .flatMap((slot): ListedChoice[] => {
        const entry = lookup.entry(slot.origin.entry);
        const element = entry?.rules[slot.rule];
        const listed = element?.key === RuleElementKey.ChoiceSet && Array.isArray(element.choices);
        return listed && entry !== undefined ? [{ slot, entryName: entry.name }] : [];
      })
      // By the entry asking, then by its rule, so the list keeps its order as slots are answered.
      .toSorted(
        (left, right) =>
          left.entryName.localeCompare(right.entryName) ||
          left.slot.rule - right.slot.rule ||
          left.slot.take - right.slot.take,
      )
  );
}
