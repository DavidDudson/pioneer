import { grantLookup, resolveGrants } from '@pioneer/rules/grants';
import type { ContentLookup, GrantResolution, OfferedOption } from '@pioneer/rules/grants';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import { Level, SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentRegistry } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import { boostContent, boostSets } from './attribute-boosts';
import type { BoostContent, BoostSet, BoostSlot } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { CHARACTER_ROOT_SLOTS } from './character-slots';

/** A selection for a slot, as `selectSlot` asks for it. */
export interface SlotPick {
  readonly slot: SlotKey;
  readonly selection: ChoiceValue;
}

/**
 * The content a slot's offer is read from: entries by id and kind, how roll option namespaces read, and the boosts
 * of each ancestry, background and class.
 */
export interface SlotContent {
  readonly lookup: ContentLookup;
  readonly namespaces: NamespaceTable;
  readonly boosts: BoostContent;
}

/** The slot content a registry gives. */
export function slotContent(registry: ContentRegistry): SlotContent {
  return {
    lookup: grantLookup(registry),
    namespaces: registry.rollOptionNamespaces(),
    boosts: boostContent(registry),
  };
}

/** The part of a pick a refusal blames. */
export const SlotRefusalField = { Slot: 'slot', Selection: 'selection' } as const;
export type SlotRefusalField = ValueOf<typeof SlotRefusalField>;

/** Why a pick is refused, and which part of it is wrong. */
export interface SlotRefusal {
  readonly field: SlotRefusalField;
  readonly message: MessageDescriptor;
}

/** What the slot is checked against: the character's other picks and the content. */
interface SlotContext extends SlotContent {
  readonly picks: ReadonlyMap<SlotKey, ChoiceValue>;
}

/**
 * What `slot` offers at the level `resolution` was read at; undefined when the character hasn't the slot there. The
 * slot's own pick is left out of the picks, so it is never answered: a `ChoiceSet` slot is among the open ones.
 */
function offerAt(resolution: GrantResolution, slot: SlotKey): readonly OfferedOption[] | undefined {
  const slots = [...resolution.rootSlots, ...resolution.open];
  return slots.find((each) => each.key === slot)?.options;
}

function resolveAt(level: Level, { picks, lookup, namespaces }: SlotContext): GrantResolution {
  return resolveGrants({
    roots: [],
    lookup,
    level,
    situation: [],
    picks,
    toggles: new Map(),
    rootSlots: CHARACTER_ROOT_SLOTS,
    namespaces,
  });
}

/** Every character level, highest first: most slots are open at 20th, so a valid pick is usually found at once. */
function levelsDown(): Level[] {
  const count = CHARACTER_LEVEL_MAX - CHARACTER_LEVEL_MIN + 1;
  return Array.from({ length: count }, (_unused, index) => Level.parse(CHARACTER_LEVEL_MAX - index));
}

const NOT_OFFERED: SlotRefusal = {
  field: SlotRefusalField.Selection,
  message: message('character.validation.selectionNotOffered'),
};

/** The boost slot `slot` and its set, if it is one the character has. */
interface BoostSlotIn {
  readonly set: BoostSet;
  readonly boost: BoostSlot;
}

function boostSlotIn(document: CharacterDocument, boosts: BoostContent, slot: SlotKey): BoostSlotIn | undefined {
  for (const set of boostSets(document, boosts)) {
    const boost = set.slots.find((each) => each.key === slot);
    if (boost !== undefined) {
      return { set, boost };
    }
  }
  return undefined;
}

/** Why `selection` can't go in the boost slot: its boost must allow it, and no other boost of its set raise it. */
function boostRefusal({ set, boost }: BoostSlotIn, selection: ChoiceValue): SlotRefusal | undefined {
  if (!boost.options.some((attribute) => attribute === selection)) {
    return NOT_OFFERED;
  }
  const taken = set.slots.some((other) => other.key !== boost.key && other.pick === selection);
  return taken ? { field: SlotRefusalField.Selection, message: message('character.validation.boostTaken') } : undefined;
}

/**
 * Why `selection` can't go in `slot`, or undefined when it can. A boost slot takes an attribute its boost allows and
 * no other boost of its set raises. Any other slot must be open at some level up to 20, and offer `selection` there.
 * The slot's own pick is left out, so it is checked as if empty; the other picks stay, so a slot an earlier pick
 * opened is found.
 */
export function slotRefusal(
  document: CharacterDocument,
  content: SlotContent,
  { slot, selection }: SlotPick,
): SlotRefusal | undefined {
  const boost = boostSlotIn(document, content.boosts, slot);
  if (boost !== undefined) {
    return boostRefusal(boost, selection);
  }
  const others = Object.entries(document.build.choices).filter(([key]) => key !== slot);
  const context: SlotContext = {
    ...content,
    picks: new Map(others.map(([key, value]) => [SlotKey.parse(key), value])),
  };
  let open = false;
  for (const level of levelsDown()) {
    const options = offerAt(resolveAt(level, context), slot);
    if (options?.some((option) => option.value === selection) === true) {
      return undefined;
    }
    open ||= options !== undefined;
  }
  return open ? NOT_OFFERED : { field: SlotRefusalField.Slot, message: message('character.validation.slotNotOpen') };
}
