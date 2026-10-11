import { boostSets, BoostSource, flawSlots } from '@pioneer/character/domain';
import type { BoostContent, BoostSlot, CharacterDocument } from '@pioneer/character/domain';
import { Attribute, AttributeModifier, AttributeSchema, ChoiceValue, Level } from '@pioneer/rules/sdk';
import type { AttributeModifiers, SlotKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { ImportedBoosts } from './read-boosts';

/** A boost Pathbuilder recorded that no slot took: its set isn't on the character, or no open slot offers it. */
export const UnplacedBoost = z.object({ source: z.enum(BoostSource), level: Level, attribute: AttributeSchema });
export type UnplacedBoost = z.infer<typeof UnplacedBoost>;

/** An attribute whose modifier from the placed boosts isn't Pathbuilder's. */
export const ModifierDifference = z.object({
  attribute: AttributeSchema,
  imported: AttributeModifier,
  derived: AttributeModifier,
});
export type ModifierDifference = z.infer<typeof ModifierDifference>;

export type BoostChoices = Readonly<Record<SlotKey, ChoiceValue>>;

/** The picks for the character's boost slots, and the boosts left over. */
export interface BoostPlacement {
  readonly choices: BoostChoices;
  readonly unplaced: readonly UnplacedBoost[];
}

/** Slots being filled from picks: pick index per slot index. */
interface Matching {
  readonly slots: readonly BoostSlot[];
  readonly picks: readonly Attribute[];
  readonly pickBySlot: Map<number, number>;
}

/** The slots that offer `pick`'s attribute, in slot order. */
function offering({ slots, picks }: Matching, pick: number): number[] {
  const attribute = picks[pick];
  return [...slots.keys()].filter(
    (slot) => attribute !== undefined && slots[slot]?.options.includes(attribute) === true,
  );
}

/**
 * Place `pick` in the first empty slot that offers it; failing that, move a pick already placed to another slot to
 * make room (an augmenting path), never through a slot in `tried` twice.
 */
function place(matching: Matching, pick: number, tried: Set<number>): boolean {
  const { pickBySlot } = matching;
  const slots = offering(matching, pick);
  const empty = slots.find((slot) => !pickBySlot.has(slot));
  if (empty !== undefined) {
    pickBySlot.set(empty, pick);
    return true;
  }
  return slots.some((slot) => {
    const holder = pickBySlot.get(slot);
    if (tried.has(slot) || holder === undefined) {
      return false;
    }
    tried.add(slot);
    const moved = place(matching, holder, tried);
    if (moved) {
      pickBySlot.set(slot, pick);
    }
    return moved;
  });
}

/** Pick index per slot index, as many picks placed as can be, each taking the first slot free for it in export order. */
function matchSlots(slots: readonly BoostSlot[], picks: readonly Attribute[]): ReadonlyMap<number, number> {
  const matching: Matching = { slots, picks, pickBySlot: new Map() };
  for (const pick of picks.keys()) {
    place(matching, pick, new Set());
  }
  return matching.pickBySlot;
}

/** The attributes left for slots: each once, and none the set's fixed boosts already raise. */
function slotPicks(attributes: readonly Attribute[], fixed: readonly Attribute[]): Attribute[] {
  const seen = new Set<Attribute>(fixed);
  return attributes.filter((attribute) => {
    if (seen.has(attribute)) {
      return false;
    }
    seen.add(attribute);
    return true;
  });
}

/** What of `attributes` is left once each of `taken` has taken one. */
function leftOver(attributes: readonly Attribute[], taken: readonly Attribute[]): Attribute[] {
  const remaining = [...taken];
  return attributes.filter((attribute) => {
    const index = remaining.indexOf(attribute);
    if (index === -1) {
      return true;
    }
    remaining.splice(index, 1);
    return false;
  });
}

/**
 * Pathbuilder's boosts in `document`'s boost slots (character-model.md, "Attribute boosts"). Each recorded set goes to
 * the character's set of the same source and level: its fixed boosts take theirs, then each slot takes a different
 * attribute it offers. Whatever no slot takes is unplaced.
 */
export function placeBoosts(
  document: CharacterDocument,
  content: BoostContent,
  imported: readonly ImportedBoosts[],
): BoostPlacement {
  const sets = boostSets(document, content);
  const choices: Record<SlotKey, ChoiceValue> = {};
  const unplaced = imported.flatMap(({ source, level, attributes }): UnplacedBoost[] => {
    const set = sets.find((each) => each.source === source && each.level === level);
    const open = set?.slots ?? [];
    const picks = slotPicks(attributes, set?.fixed ?? []);
    const placed = [...matchSlots(open, picks)].flatMap(([slot, pick]) => {
      const key = open[slot]?.key;
      const attribute = picks[pick];
      if (key === undefined || attribute === undefined) {
        return [];
      }
      choices[key] = ChoiceValue.parse(attribute);
      return [attribute];
    });
    return leftOver(attributes, [...(set?.fixed ?? []), ...placed]).map((attribute) => ({ source, level, attribute }));
  });
  return { choices, unplaced };
}

/**
 * Pathbuilder's voluntary flaws in `document`'s flaw slots (#550): each attribute its ancestry doesn't flaw already,
 * once, in export order. The ancestry's own flaws come from its content, so they take no slot.
 */
export function placeFlaws(
  document: CharacterDocument,
  content: BoostContent,
  flaws: readonly Attribute[],
): BoostChoices {
  const slots = flawSlots(document, content);
  const voluntary = [...new Set(flaws)].filter((attribute) => slots[0]?.options.includes(attribute) === true);
  return Object.fromEntries(
    voluntary.flatMap((attribute, index) => {
      const key = slots[index]?.key;
      return key === undefined ? [] : [[key, ChoiceValue.parse(attribute)]];
    }),
  );
}

/** Each attribute, in order, whose derived modifier isn't the one Pathbuilder computed. */
export function modifierDifferences(imported: AttributeModifiers, derived: AttributeModifiers): ModifierDifference[] {
  return Object.values(Attribute).flatMap((attribute): ModifierDifference[] => {
    const theirs = imported.get(attribute);
    const ours = derived.get(attribute);
    return theirs === ours ? [] : [{ attribute, imported: theirs, derived: ours }];
  });
}
