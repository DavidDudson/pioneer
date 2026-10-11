import { ContentId, OriginHopKind } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentKind, OriginHop, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { ChoicePicks } from './choices';
import type { ContentLookup, GrantEntry, GrantError, GrantRoot } from './grant-entry';
import { GrantsMessage } from './messages';
import { Offer } from './offers';
import type { OfferedOption } from './offers';
import { byCodeUnit } from './order';

/**
 * A slot the character has itself, not through an entry: its ancestry, heritage, background or class. It offers
 * every entry of `kind`, and its pick is a root of the grants. A slot `within` another, listed after it, offers only
 * the entries that belong to that slot's pick and those that belong to none: a heritage of the ancestry, or a
 * versatile one. While that slot is open, it offers only the latter.
 */
export interface RootSlotDefinition {
  readonly key: SlotKey;
  readonly kind: ContentKind;
  readonly within?: SlotKey;
}

/** A root slot on the character, with what it offers and the pick that answers it. */
export interface RootSlot extends RootSlotDefinition {
  readonly options: readonly OfferedOption[];
  /** Undefined while the slot is open: no pick, or a pick the slot doesn't offer. */
  readonly pick: ContentId | undefined;
}

/** The root slots read against the picks: each slot, the roots their picks add, and the picks that aren't on offer. */
export interface RootSlotsRead {
  readonly slots: readonly RootSlot[];
  readonly roots: readonly GrantRoot[];
  readonly errors: readonly GrantError[];
}

/** What a root slot offers: entries of its kind, and when it is `within` another, only those that fit that slot's pick. */
interface SlotScope {
  readonly kind: ContentKind;
  readonly lookup: ContentLookup;
  readonly nested: boolean;
  /** The pick of the slot it is `within`; undefined when that slot is open, or the slot is within none. */
  readonly parent: ContentId | undefined;
}

/** Whether the slot offers `entry`: of its kind, and when nested, belonging to the parent pick or to none. */
function offers({ kind, nested, parent }: SlotScope, entry: GrantEntry): boolean {
  const fits = !nested || entry.belongsTo === undefined || entry.belongsTo === parent;
  return entry.kind === kind && fits;
}

/** By name, then id, as `ChoiceSet` query offers sort, so a builder list keeps its order. */
function byLabel(left: OfferedOption, right: OfferedOption): number {
  return byCodeUnit(left.label, right.label) || byCodeUnit(left.value, right.value);
}

/** Every entry the slot offers, sorted by name, then id. */
function offered(scope: SlotScope): OfferedOption[] {
  const entries = scope.lookup.ofKind(scope.kind).filter((entry) => offers(scope, entry));
  return entries.map((entry) => ({ value: entry.id, label: entry.name, summary: undefined })).toSorted(byLabel);
}

/** `definition` with its offer, worked out the first time it is read, and `pick`. */
function slotOf(definition: RootSlotDefinition, scope: SlotScope, pick: ContentId | undefined): RootSlot {
  const offer = new Offer(() => offered(scope));
  return {
    ...definition,
    pick,
    get options(): readonly OfferedOption[] {
      return offer.options;
    },
  };
}

/** The entry `value` names, if the slot offers it. */
function pickOf(value: ChoiceValue, scope: SlotScope): ContentId | undefined {
  const id = ContentId.safeParse(value);
  const entry = id.success ? scope.lookup.entry(id.data) : undefined;
  return entry !== undefined && offers(scope, entry) ? entry.id : undefined;
}

/** The scope `definition` offers in, given the picks of the slots read before it. */
function scopeOf(
  { kind, within }: RootSlotDefinition,
  lookup: ContentLookup,
  answered: ReadonlyMap<SlotKey, ContentId>,
): SlotScope {
  return {
    kind,
    lookup,
    nested: within !== undefined,
    parent: within === undefined ? undefined : answered.get(within),
  };
}

/** One root slot read: the slot, the root its pick adds, and the error a pick it doesn't offer is. */
interface SlotRead {
  readonly slot: RootSlot;
  readonly root: GrantRoot | undefined;
  readonly error: GrantError | undefined;
}

function readSlot(definition: RootSlotDefinition, value: ChoiceValue | undefined, scope: SlotScope): SlotRead {
  const pick = value === undefined ? undefined : pickOf(value, scope);
  const hop: OriginHop = { kind: OriginHopKind.Choice, slot: definition.key };
  const unoffered = pick === undefined && value !== undefined;
  return {
    slot: slotOf(definition, scope, pick),
    root: pick === undefined ? undefined : { entry: pick, hop },
    error: unoffered
      ? { error: message(GrantsMessage.RootPickNotOffered, { value, kind: definition.kind }), hops: [hop] }
      : undefined,
  };
}

/**
 * Reads each root slot against the picks, in order. A pick the slot offers (an entry of its kind that, for a slot
 * `within` another, fits that slot's pick) answers it and adds that entry as a root, behind a `choice` hop. With no
 * pick the slot is open; a pick it doesn't offer is an error and the slot is open, as a `ChoiceSet` pick no longer on
 * offer is.
 */
export function readRootSlots(
  definitions: readonly RootSlotDefinition[],
  picks: ChoicePicks,
  lookup: ContentLookup,
): RootSlotsRead {
  const answered = new Map<SlotKey, ContentId>();
  const reads: SlotRead[] = [];
  for (const definition of definitions) {
    const read = readSlot(definition, picks.get(definition.key), scopeOf(definition, lookup, answered));
    if (read.root !== undefined) {
      answered.set(definition.key, read.root.entry);
    }
    reads.push(read);
  }
  return {
    slots: reads.map((read) => read.slot),
    roots: reads.flatMap((read) => read.root ?? []),
    errors: reads.flatMap((read) => read.error ?? []),
  };
}
