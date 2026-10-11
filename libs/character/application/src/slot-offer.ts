import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN, CHARACTER_ROOT_SLOTS } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import { registryLookup, resolveGrants } from '@pioneer/rules/grants';
import type { ContentLookup, GrantResolution, OfferedOption } from '@pioneer/rules/grants';
import { Level, SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentRegistry } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** A selection for a slot, as `selectSlot` asks for it. */
export interface SlotPick {
  readonly slot: SlotKey;
  readonly selection: ChoiceValue;
}

/** What a selection is checked against: the character's other picks and the content they read. */
interface SlotContext {
  readonly picks: ReadonlyMap<SlotKey, ChoiceValue>;
  readonly lookup: ContentLookup;
  readonly registry: ContentRegistry;
}

/** What `slot` offers at the level `resolution` was read at; undefined when the character hasn't the slot there. */
function offerAt(resolution: GrantResolution, slot: SlotKey): readonly OfferedOption[] | undefined {
  const all = [...resolution.rootSlots, ...resolution.open, ...resolution.answered];
  return all.find((each) => each.key === slot)?.options;
}

function resolveAt(level: Level, { picks, lookup, registry }: SlotContext): GrantResolution {
  return resolveGrants({
    roots: [],
    lookup,
    level,
    situation: [],
    picks,
    toggles: new Map(),
    rootSlots: CHARACTER_ROOT_SLOTS,
    namespaces: registry.rollOptionNamespaces(),
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
  registry: ContentRegistry,
  { slot, selection }: SlotPick,
): MessageDescriptor | undefined {
  const others = Object.entries(document.build.choices).filter(([key]) => key !== slot);
  const context: SlotContext = {
    picks: new Map(others.map(([key, value]) => [SlotKey.parse(key), value])),
    lookup: registryLookup(registry),
    registry,
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
    ? message('character.validation.selectionNotOffered', { slot, selection })
    : message('character.validation.slotNotOpen', { slot });
}
