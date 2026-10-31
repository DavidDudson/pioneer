import type { ContentLookup, GrantRoot } from '@pioneer/rules/grants';
import { Attribute, ContentKind, OriginHopKind, RollOption, RuleElementKey, Slug } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { attributeModifiers } from './attribute-boosts';
import { Encumbrance, inventoryBulk } from './bulk';
import type { CharacterDocument } from './character-document';
import type { ItemContent } from './inventory-content';
import type { SlotContent } from './slot-offer';

/** The encumbered condition, by its name within its kind. */
const ENCUMBERED = Slug.parse('encumbered');

/** What a variant rule that does away with encumbrance puts in play (No Encumbrance). */
export const NO_ENCUMBRANCE = RollOption.parse('self:encumbrance:off');

/** Whether a variant rule in force puts `NO_ENCUMBRANCE` in play. */
function encumbranceOff({ lookup, variantRoots }: SlotContent): boolean {
  return variantRoots.some(
    ({ entry }) =>
      lookup
        .entry(entry)
        ?.rules.some((rule) => rule.key === RuleElementKey.RollOption && rule.option === NO_ENCUMBRANCE) === true,
  );
}

function conditionNamed(lookup: ContentLookup, name: Slug): ContentId | undefined {
  return lookup.ofKind(ContentKind.Condition).findLast((entry) => entry.slug === name)?.id;
}

/**
 * The encumbered condition as a root with a condition hop while the character carries more Bulk than 5 plus its
 * Strength modifier (`inventoryBulk`); none while it doesn't, or while no loaded pack has the condition. The last
 * pack's entry wins, as in the registry. None under a variant rule that turns encumbrance off, however much it carries.
 */
export function encumberedRoots(
  document: CharacterDocument,
  content: ItemContent,
  slots: SlotContent,
): readonly GrantRoot[] {
  if (encumbranceOff(slots)) {
    return [];
  }
  const strength = attributeModifiers(document, slots.boosts).get(Attribute.Strength);
  const { encumbrance } = inventoryBulk(document.inventory, content, strength);
  const condition = conditionNamed(slots.lookup, ENCUMBERED);
  if (encumbrance === Encumbrance.Unencumbered || condition === undefined) {
    return [];
  }
  return [{ entry: condition, hop: { kind: OriginHopKind.Condition, condition } }];
}
