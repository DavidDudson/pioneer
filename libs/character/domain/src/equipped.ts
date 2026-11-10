import { battleFormInPlay, factsUnderForm } from '@pioneer/rules/engine';
import type { FormInPlay, ModifierInputs, RuleInPlay } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import type { GrantResolution, GrantRoot, ToggleSlot } from '@pioneer/rules/grants';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { Level, SlotKey } from '@pioneer/rules/sdk';

import { activeItems, inventoryHop } from './active-items';
import type { CharacterDocument } from './character-document';
import { conditionRoots } from './conditions';
import { exclusiveEffects } from './effect-exclusivity';
import { badgeOptions, effectRoots } from './effects';
import type { ActiveEffect } from './effects';
import { encumberedRoots } from './encumbered-roots';
import { equippedRulesOf, fromInventory, rulesOf } from './entry-rules';
import type { Resolved } from './entry-rules';
import { environmentRoots } from './environments';
import type { ItemContent } from './inventory-content';
import { runeReader, workingPropertyRunes } from './item-runes';
import { ownedItems, pickedItems } from './owned-items';
import type { PickedItems } from './owned-items';
import { attributesAt } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { toggleStates } from './toggle-commands';
import { shapedInventory } from './weapon-shapes';

/** The rules in play and the facts they read, with the `RollOption` toggles the character's items offer. */
export interface EquippedRules extends ModifierInputs {
  readonly toggles: readonly ToggleSlot[];
  /** The items the character's `ChoiceSet`s over owned items picked (ADR-0075). */
  readonly picked: PickedItems;
}

/**
 * Everything the character's active items, the property runes working on them, the encumbered condition while it carries
 * too much (`encumberedRoots`) and the conditions active in its play state (`conditionRoots`) put in play, resolved with
 * the character's picks so an item's predicate sees its ancestry and class. Each entry's origin starts at its inventory
 * or condition hop; the facts are what every predicate reads.
 */
function equippedResolution(document: CharacterDocument, content: ItemContent, slots: SlotContent): GrantResolution {
  const { lookup, namespaces, rootSlots } = slots;
  const active = activeItems(document.inventory, content);
  const exclusive = exclusiveEffects(document.play.effects, lookup);
  const level = Level.parse(document.level);
  const roots: GrantRoot[] = [
    ...active.flatMap((each) => {
      const hop = inventoryHop(each);
      return [each.entry.id, ...workingPropertyRunes(each.item, each.entry, runeReader(lookup))].map((entry) => ({
        entry,
        hop,
      }));
    }),
    ...encumberedRoots(document, content, slots),
    ...conditionRoots(document.play.conditions),
    ...effectRoots(exclusive.active),
    ...environmentRoots(document.play.environments),
  ];
  return resolveGrants({
    roots,
    lookup,
    level,
    owned: ownedItems(document.inventory, content),
    attributes: attributesAt(document, slots)(level),
    situation: [
      ...(slots.situation ?? []),
      ...badgeOptions(exclusive.active, lookup),
      ...exclusive.active.flatMap(({ form }) => (form === undefined ? [] : [form])),
    ],
    picks: new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value])),
    toggles: toggleStates(document.play.toggles),
    rootSlots,
    namespaces,
  });
}

/** An entry that is in play through the inventory or a condition, and why. */
export interface EquippedGrants {
  readonly items: readonly Resolved[];
  /** With the traits of the battle form in force, as the character's own. */
  readonly facts: PredicateFacts;
  /** The battle form in force; none when there is none. */
  readonly form: FormInPlay | undefined;
  /** The polymorph effects a newer one replaced, oldest first, so play can end them. */
  readonly replacedEffects: readonly ActiveEffect[];
}

/** What the character's active items and conditions put in play, and the facts that holds (see `equippedRules`). */
export function equippedGrants(document: CharacterDocument, content: ItemContent, slots: SlotContent): EquippedGrants {
  const shaped = shapedDocument(document, content, slots);
  const resolution = equippedResolution(shaped, content, slots);
  const rules = rulesOf(resolution, { inventory: shaped.inventory, content }, fromInventory);
  const inputs = { rules, facts: resolution.facts };
  return {
    items: resolution.items.filter(({ origin }) => fromInventory(origin)),
    facts: factsUnderForm(inputs),
    form: battleFormInPlay(inputs),
    replacedEffects: exclusiveEffects(document.play.effects, slots.lookup).replaced,
  };
}

/**
 * The rule elements of the character's active items and the property runes working on them (`workingPropertyRunes`),
 * of the encumbered condition while it carries too much (`encumberedRoots`), of the conditions active in its play state
 * (`conditionRoots`), and of what they grant, each with an origin that starts at its inventory or condition hop, and
 * the facts their predicates are read against. Grants are resolved with the character's picks, so an item's
 * predicate sees its ancestry and class. Rule elements of the build itself arrive with the builder (Epic 3.3).
 */
export function equippedRules(document: CharacterDocument, content: ItemContent, slots: SlotContent): EquippedRules {
  const shaped = shapedDocument(document, content, slots);
  const resolution = equippedResolution(shaped, content, slots);
  const toggles = resolution.toggles.filter(({ origin }) => fromInventory(origin));
  const rules = equippedRulesOf(resolution, { inventory: shaped.inventory, content }, slots.lookup);
  return {
    rules,
    facts: factsUnderForm({ rules, facts: resolution.facts }),
    toggles,
    picked: pickedItems(resolution, slots.lookup),
  };
}

/**
 * The rule elements the character's build puts in play: its ancestry, heritage, class and class features, background
 * and feats, and what they grant, with the same facts as `equippedRules` so a predicate sees the build and the gear.
 * Statistics read them beside the items' (`characterStatistics`); a Hit Points feat such as Toughness is one of them.
 */
export function buildRules(
  document: CharacterDocument,
  content: ItemContent,
  slots: SlotContent,
): readonly RuleInPlay[] {
  const shaped = shapedDocument(document, content, slots);
  const resolution = equippedResolution(shaped, content, slots);
  return rulesOf(resolution, { inventory: shaped.inventory, content }, (origin) => !fromInventory(origin));
}

/** `document` with each shifted item as the weapon it has taken the shape of (`shapedInventory`). */
export function shapedDocument(
  document: CharacterDocument,
  content: ItemContent,
  slots: SlotContent,
): CharacterDocument {
  const { runes } = slots;
  return runes === undefined
    ? document
    : { ...document, inventory: shapedInventory(document.inventory, document.play.shapes, { items: content, runes }) };
}
