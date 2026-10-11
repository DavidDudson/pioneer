import { resolveGrants } from '@pioneer/rules/grants';
import type { ContentLookup, GrantResolution, OfferedOption } from '@pioneer/rules/grants';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import { Level, SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { CHARACTER_ROOT_SLOTS } from './character-slots';

/** A selection for a slot, as `selectSlot` asks for it. */
export interface SlotPick {
  readonly slot: SlotKey;
  readonly selection: ChoiceValue;
}

/** The content a slot's offer is read from: entries by id and kind, and how roll option namespaces read. */
export interface SlotContent {
  readonly lookup: ContentLookup;
  readonly namespaces: NamespaceTable;
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

/**
 * Why `selection` can't go in `slot`, or undefined when it can: the slot must be open at some level up to 20, and
 * offer `selection` there. The slot's own pick is left out, so it is checked as if empty; the other picks stay, so a
 * slot an earlier pick opened is found.
 */
export function slotRefusal(
  document: CharacterDocument,
  content: SlotContent,
  { slot, selection }: SlotPick,
): SlotRefusal | undefined {
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
  return open
    ? { field: SlotRefusalField.Selection, message: message('character.validation.selectionNotOffered') }
    : { field: SlotRefusalField.Slot, message: message('character.validation.slotNotOpen') };
}
