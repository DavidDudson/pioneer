import {
  ANCESTRY_SLOT,
  BACKGROUND_SLOT,
  boostSets,
  BoostSource,
  characterGrants,
  characterTraits,
  CLASS_SLOT,
  classContent,
  classFeatures,
  DEITY_SLOT,
  hasSecondClass,
  HERITAGE_SLOT,
  rootSlotOptions,
  SECOND_CLASS_SLOT,
  secondSubclassSlot,
  SlotStatus,
  subclassSlot,
} from '@pioneer/character/domain';
import type { Character, CharacterSlot } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { ChoiceValue, ContentKind, slugName, Trait } from '@pioneer/rules/sdk';
import type { Attribute, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { BuildPart } from '@pioneer/rules/ui';
import type { BuildLine, BuildValue, ClassFeatureLine } from '@pioneer/rules/ui';
import * as z from 'zod';

import { sheetSlotContent } from './sheet-slot-content';

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
  const set = boostSets(character.document, sheetSlotContent(registry).boosts).find(
    (each) => each.source === BoostSource.Class,
  );
  const attribute: Attribute | undefined = set?.fixed[0] ?? set?.slots[0]?.pick;
  return attribute === undefined ? undefined : { attribute };
}

function size(registry: ContentRegistry, character: Character): BuildValue | undefined {
  const ancestry = character.ancestry === undefined ? undefined : registry.ancestry(character.ancestry);
  return ancestry === undefined ? undefined : { size: ancestry.definition.size };
}

/** Trait names already read, by registry: a registry's packs never change once loaded. */
const TRAIT_NAMES = new WeakMap<ContentRegistry, ReadonlyMap<Trait, string>>();

/** Each trait's name, by its entry in the trait vocabulary; the last pack's wins, as in the registry. */
export function traitNames(registry: ContentRegistry): ReadonlyMap<Trait, string> {
  const read =
    TRAIT_NAMES.get(registry) ??
    new Map(
      registry.packs
        .flatMap((pack) => pack.otherEntries)
        .flatMap((entry): [Trait, string][] =>
          entry.kind === ContentKind.Trait ? [[Trait.parse(slugName(entry.slug)), entry.name]] : [],
        ),
    );
  TRAIT_NAMES.set(registry, read);
  return read;
}

/**
 * The character's traits by name (#598): its ancestry's, and those its features add or remove. A trait the vocabulary
 * doesn't name shows as itself. None while it has none, as before an ancestry is picked.
 */
function traits(registry: ContentRegistry, character: Character): BuildValue | undefined {
  const names = traitNames(registry);
  const own = characterTraits(characterGrants(character.document, sheetSlotContent(registry)));
  return own.length === 0 ? undefined : { traits: own.map((trait) => names.get(trait) ?? trait) };
}

/**
 * What the character is, for the build summary: its class, subclass, ancestry, heritage and background by the names the
 * server read for their slots, its deity likewise, its key attribute, its ancestry's size and its traits.
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
    { part: BuildPart.Deity, value: picked(slots, DEITY_SLOT) },
    { part: BuildPart.KeyAttribute, value: keyAttribute(registry, character) },
    { part: BuildPart.Size, value: size(registry, character) },
    { part: BuildPart.Traits, value: traits(registry, character) },
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
  const options = rootSlotOptions(character.document, sheetSlotContent(registry), slot);
  return options.map((option) => ({ value: option.value, label: option.label }));
}

/** The class's subclass slot (a doctrine, muse, order or school) and what it offers, by name. */
export interface SheetSubclass {
  readonly key: SlotKey;
  readonly options: readonly SelectOption<string>[];
}

/**
 * The subclass slot of the character's class, or its second class's when `classSlot` is the second class slot;
 * undefined before a class is picked, or for a class without one.
 */
export function sheetSubclass(
  registry: ContentRegistry,
  character: Character,
  classSlot: SlotKey = CLASS_SLOT,
): SheetSubclass | undefined {
  const content = sheetSlotContent(registry);
  const find = classSlot === SECOND_CLASS_SLOT ? secondSubclassSlot : subclassSlot;
  const slot = find(characterGrants(character.document, content), content.lookup, classContent(registry));
  return slot === undefined
    ? undefined
    : { key: slot.key, options: slot.options.map((option) => ({ value: option.value, label: option.label })) };
}

/** The class's key attribute slot and the attributes it allows; undefined when the class allows only one. */
export interface SheetKeyAttribute {
  readonly key: SlotKey;
  readonly options: readonly Attribute[];
}

/** The class's key attribute slot (the second class's for `BoostSource.SecondClass`); undefined when it allows one. */
export function sheetKeyAttribute(
  registry: ContentRegistry,
  character: Character,
  source: BoostSource = BoostSource.Class,
): SheetKeyAttribute | undefined {
  const set = boostSets(character.document, sheetSlotContent(registry).boosts).find((each) => each.source === source);
  const slot = set?.slots[0];
  return slot === undefined ? undefined : { key: slot.key, options: slot.options };
}

/** Whether the character has a second class slot: the Dual Class variant is in force for it. */
export function sheetHasSecondClass(registry: ContentRegistry): boolean {
  return hasSecondClass(sheetSlotContent(registry).rootSlots);
}

/**
 * The class features the character has at its level, with the class and level each came from: its class's, then its
 * second class's when it has one.
 */
export function sheetClassFeatures(registry: ContentRegistry, character: Character): readonly ClassFeatureLine[] {
  const content = sheetSlotContent(registry);
  const grants = characterGrants(character.document, content);
  const slots = sheetHasSecondClass(registry) ? [CLASS_SLOT, SECOND_CLASS_SLOT] : [CLASS_SLOT];
  return slots.flatMap((slot) =>
    classFeatures(grants, content.lookup, slot).map((feature) => ({
      key: feature.id,
      name: feature.name,
      className: feature.className,
      level: feature.level,
    })),
  );
}
