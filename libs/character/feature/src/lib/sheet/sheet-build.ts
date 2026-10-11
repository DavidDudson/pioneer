import {
  ANCESTRY_SLOT,
  BACKGROUND_SLOT,
  boostContent,
  boostSets,
  BoostSource,
  characterGrants,
  CLASS_SLOT,
  classContent,
  classFeatures,
  HERITAGE_SLOT,
  rootSlotOptions,
  slotContent,
  SlotStatus,
  subclassSlot,
} from '@pioneer/character/domain';
import type { Character, CharacterSlot } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { Attribute, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { BuildPart } from '@pioneer/rules/ui';
import type { BuildLine, BuildValue, ClassFeatureLine } from '@pioneer/rules/ui';
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
 * What the character is, for the build summary: its class, subclass, ancestry, heritage and background by the names the
 * server read for their slots, its key attribute and its ancestry's size. Deity has no slot yet (#469), so it says what
 * to pick.
 */
export function sheetBuildSummary(
  registry: ContentRegistry,
  character: Character,
  slots: readonly CharacterSlot[],
): readonly BuildLine[] {
  const subclass = sheetSubclass(registry, character);
  return [
    { part: BuildPart.Class, value: picked(slots, CLASS_SLOT) },
    { part: BuildPart.Subclass, value: subclass === undefined ? undefined : picked(slots, subclass.key) },
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

/** The class's subclass slot (a doctrine, muse, order or school) and what it offers, by name. */
export interface SheetSubclass {
  readonly key: SlotKey;
  readonly options: readonly SelectOption<string>[];
}

/** The subclass slot of the character's class; undefined before a class is picked, or for a class without one. */
export function sheetSubclass(registry: ContentRegistry, character: Character): SheetSubclass | undefined {
  const content = slotContent(registry);
  const slot = subclassSlot(characterGrants(character.document, content), content.lookup, classContent(registry));
  return slot === undefined
    ? undefined
    : { key: slot.key, options: slot.options.map((option) => ({ value: option.value, label: option.label })) };
}

/** The class's key attribute slot and the attributes it allows; undefined when the class allows only one. */
export interface SheetKeyAttribute {
  readonly key: SlotKey;
  readonly options: readonly Attribute[];
}

export function sheetKeyAttribute(registry: ContentRegistry, character: Character): SheetKeyAttribute | undefined {
  const set = boostSets(character.document, boostContent(registry)).find((each) => each.source === BoostSource.Class);
  const slot = set?.slots[0];
  return slot === undefined ? undefined : { key: slot.key, options: slot.options };
}

/** The class features the character has at its level, with the class and level each came from. */
export function sheetClassFeatures(registry: ContentRegistry, character: Character): readonly ClassFeatureLine[] {
  const content = slotContent(registry);
  return classFeatures(characterGrants(character.document, content), content.lookup).map((feature) => ({
    key: feature.id,
    name: feature.name,
    className: feature.className,
    level: feature.level,
  }));
}
