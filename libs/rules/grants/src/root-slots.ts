import { ContentId, OriginHopKind } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentKind, OriginHop, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { ChoicePicks } from './choices';
import type { ContentLookup, GrantError, GrantRoot } from './grant-entry';
import { GrantsMessage } from './messages';
import { Offer } from './offers';
import type { OfferedOption } from './offers';
import { byCodeUnit } from './order';

/**
 * A slot the character has itself, not through an entry: its ancestry, heritage, background or class. It offers
 * every entry of `kind`, and its pick is a root of the grants.
 */
export interface RootSlotDefinition {
  readonly key: SlotKey;
  readonly kind: ContentKind;
}

/** A root slot on the character, with what it offers and the pick that answers it. */
export interface RootSlot extends RootSlotDefinition {
  readonly options: readonly OfferedOption[];
  /** Undefined while the slot is open: no pick, or a pick that is not an entry of the slot's kind. */
  readonly pick: ContentId | undefined;
}

/** The root slots read against the picks: each slot, the roots their picks add, and the picks that aren't on offer. */
export interface RootSlotsRead {
  readonly slots: readonly RootSlot[];
  readonly roots: readonly GrantRoot[];
  readonly errors: readonly GrantError[];
}

/** By name, then id, as `ChoiceSet` query offers sort, so a builder list keeps its order. */
function byLabel(left: OfferedOption, right: OfferedOption): number {
  return byCodeUnit(left.label, right.label) || byCodeUnit(left.value, right.value);
}

/** Every entry of `kind`, sorted by name, then id. */
function offeredOfKind(kind: ContentKind, lookup: ContentLookup): OfferedOption[] {
  const offered = lookup.ofKind(kind).map((entry) => ({ value: entry.id, label: entry.name, summary: undefined }));
  return offered.toSorted(byLabel);
}

/** `definition` with its offer, worked out the first time it is read, and `pick`. */
function slotOf(definition: RootSlotDefinition, lookup: ContentLookup, pick: ContentId | undefined): RootSlot {
  const offer = new Offer(() => offeredOfKind(definition.kind, lookup));
  return {
    ...definition,
    pick,
    get options(): readonly OfferedOption[] {
      return offer.options;
    },
  };
}

/** The entry `value` names, if it is one of `kind`. */
function pickOf(value: ChoiceValue, kind: ContentKind, lookup: ContentLookup): ContentId | undefined {
  const id = ContentId.safeParse(value);
  return id.success && lookup.entry(id.data)?.kind === kind ? id.data : undefined;
}

/**
 * Reads each root slot against the picks. A pick that is an entry of the slot's kind answers it and adds that entry
 * as a root, behind a `choice` hop. With no pick the slot is open; a pick that isn't an entry of its kind is an error
 * and the slot is open, as a `ChoiceSet` pick no longer on offer is.
 */
export function readRootSlots(
  definitions: readonly RootSlotDefinition[],
  picks: ChoicePicks,
  lookup: ContentLookup,
): RootSlotsRead {
  const slots: RootSlot[] = [];
  const roots: GrantRoot[] = [];
  const errors: GrantError[] = [];
  for (const definition of definitions) {
    const value = picks.get(definition.key);
    const pick = value === undefined ? undefined : pickOf(value, definition.kind, lookup);
    slots.push(slotOf(definition, lookup, pick));
    const hop: OriginHop = { kind: OriginHopKind.Choice, slot: definition.key };
    if (pick !== undefined) {
      roots.push({ entry: pick, hop });
    } else if (value !== undefined) {
      errors.push({ error: message(GrantsMessage.RootPickNotOffered, { value, kind: definition.kind }), hops: [hop] });
    }
  }
  return { slots, roots, errors };
}
