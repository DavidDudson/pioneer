import {
  ANCESTRY_SLOT,
  BACKGROUND_SLOT,
  boostContent,
  boostSets,
  BoostSource,
  CLASS_SLOT,
  HERITAGE_SLOT,
  rootSlotOptions,
  slotContent,
  SlotStatus,
} from '@pioneer/character/domain';
import type { Character, CharacterSlot } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { Attribute, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { BuildPart } from '@pioneer/rules/ui';
import type { BuildLine, BuildValue } from '@pioneer/rules/ui';
import * as z from 'zod';

/** An empty pick in one of the character's own slots, as the select's placeholder reads it. */
export const NOT_CHOSEN = '';

/** A pick in one of the character's own slots, or none. */
export const RootPick = z.union([ChoiceValue, z.literal(NOT_CHOSEN)]);

/** The name of the entry picked in `slot`, when the slot holds one it offers. */
function picked(slots: readonly CharacterSlot[], slot: SlotKey): BuildValue | undefined {
  const found = slots.find((each) => each.key === slot);
  return found?.status === SlotStatus.Filled && found.selectionName !== undefined
    ? { name: found.selectionName }
    : undefined;
}

/** The class's key attribute: the one it allows, or the one picked from those it allows. */
function keyAttribute(registry: ContentRegistry, character: Character): BuildValue | undefined {
  const set = boostSets(character.document, boostContent(registry)).find((each) => each.source === BoostSource.Class);
  const attribute: Attribute | undefined = set?.fixed[0] ?? set?.slots[0]?.pick;
  return attribute === undefined ? undefined : { attribute };
}

function size(registry: ContentRegistry, character: Character): BuildValue | undefined {
  const ancestry = character.ancestry === undefined ? undefined : registry.ancestry(character.ancestry);
  return ancestry === undefined ? undefined : { size: ancestry.definition.size };
}

/**
 * What the character is, for the build summary (#462): its class, ancestry, heritage and background by the names the
 * server read for their slots, its key attribute and its ancestry's size. Subclass and deity have no slot yet (#463,
 * #469), so they say what to pick.
 */
export function sheetBuildSummary(
  registry: ContentRegistry,
  character: Character,
  slots: readonly CharacterSlot[],
): readonly BuildLine[] {
  return [
    { part: BuildPart.Class, value: picked(slots, CLASS_SLOT) },
    { part: BuildPart.Subclass, value: undefined },
    { part: BuildPart.Ancestry, value: picked(slots, ANCESTRY_SLOT) },
    { part: BuildPart.Heritage, value: picked(slots, HERITAGE_SLOT) },
    { part: BuildPart.Background, value: picked(slots, BACKGROUND_SLOT) },
    { part: BuildPart.Deity, value: undefined },
    { part: BuildPart.KeyAttribute, value: keyAttribute(registry, character) },
    { part: BuildPart.Size, value: size(registry, character) },
  ];
}

/**
 * The picker options of one of the character's own slots, by name: every background, or the heritages of its ancestry
 * and the versatile ones, read over its other picks as the server reads them.
 */
export function sheetRootOptions(
  registry: ContentRegistry,
  character: Character,
  slot: SlotKey,
): readonly SelectOption<string>[] {
  const options = rootSlotOptions(character.document, slotContent(registry), slot);
  return options.map((option) => ({ value: option.value, label: option.label }));
}
