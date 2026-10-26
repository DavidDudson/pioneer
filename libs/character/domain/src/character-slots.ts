import type { GrantRoot, RootSlotDefinition } from '@pioneer/rules/grants';
import {
  ContentId,
  ContentKind,
  OriginHopKind,
  RollOption,
  RuleElementKey,
  SlotKey,
  VariantStructure,
} from '@pioneer/rules/sdk';
import type { VariantRuleEntry } from '@pioneer/rules/sdk';

/** The slot the character's ancestry is picked in (character-model.md, "Choice slots"). */
export const ANCESTRY_SLOT = SlotKey.parse('ancestry');
export const HERITAGE_SLOT = SlotKey.parse('heritage');
export const BACKGROUND_SLOT = SlotKey.parse('background');
export const CLASS_SLOT = SlotKey.parse('class');
export const DEITY_SLOT = SlotKey.parse('deity');
/** The second class's slot, a root slot only while the Dual Class variant is in force (`characterRootSlots`). */
export const SECOND_CLASS_SLOT = SlotKey.parse('second-class');

/**
 * The slots a character has itself, before any entry grants more. The heritage slot is within the ancestry slot: it
 * offers that ancestry's heritages and the versatile ones.
 */
export const CHARACTER_ROOT_SLOTS: readonly RootSlotDefinition[] = [
  { key: ANCESTRY_SLOT, kind: ContentKind.Ancestry },
  { key: HERITAGE_SLOT, kind: ContentKind.Heritage, within: ANCESTRY_SLOT },
  { key: BACKGROUND_SLOT, kind: ContentKind.Background },
  { key: CLASS_SLOT, kind: ContentKind.Class },
  { key: DEITY_SLOT, kind: ContentKind.Deity },
];

const SECOND_CLASS_ROOT_SLOT: RootSlotDefinition = { key: SECOND_CLASS_SLOT, kind: ContentKind.Class };

/**
 * The slots the character has itself with `variants` in force: Dual Class (a variant whose `structure` says
 * `secondClass`) adds the second class's, beside the first's. A pick for a slot it does not have is kept and read
 * again when the variant comes back.
 */
export function characterRootSlots(variants: readonly VariantRuleEntry[]): readonly RootSlotDefinition[] {
  const dualClass = variants.some(
    (variant) => variant.definition.structure?.includes(VariantStructure.SecondClass) === true,
  );
  return dualClass ? [...CHARACTER_ROOT_SLOTS, SECOND_CLASS_ROOT_SLOT] : CHARACTER_ROOT_SLOTS;
}

/**
 * The variant rules in force that add feat slots of their own (a `structure` of `extraSlots`: Free Archetype's) or
 * put a roll option in play (No Dedication Lock's), as grant roots, so the `ChoiceSet`s and `RollOption`s in their
 * rules count beside the character's. A pick for a slot it does not have is kept and read again when the variant
 * comes back.
 */
export function variantGrantRoots(variants: readonly VariantRuleEntry[]): readonly GrantRoot[] {
  return variants
    .filter(
      ({ definition }) =>
        definition.structure?.includes(VariantStructure.ExtraSlots) === true ||
        definition.rules.some(({ key }) => key === RuleElementKey.RollOption),
    )
    .map(({ id }): GrantRoot => {
      const entry = ContentId.parse(id);
      return { entry, hop: { kind: OriginHopKind.Variant, rule: entry } };
    });
}

/** Whether `rootSlots` hold the second class's slot. */
export function hasSecondClass(rootSlots: readonly RootSlotDefinition[]): boolean {
  return rootSlots.some((slot) => slot.key === SECOND_CLASS_SLOT);
}

/**
 * Root slots a character may leave empty, each with the options that make it one to fill: any character may worship
 * a deity, and a cleric must (Player Core's Deity class feature). Empty, such a slot is listed only while one of
 * its options is set, as an empty voluntary flaw never is.
 */
export const OPTIONAL_ROOT_SLOTS: ReadonlyMap<SlotKey, readonly RollOption[]> = new Map([
  [DEITY_SLOT, [RollOption.parse('feature:deity-cleric')]],
]);

/** Whether one of the character's roll options makes it need a deity: a cleric's does. */
export function needsDeity(rollOptions: readonly RollOption[]): boolean {
  const neededBy = OPTIONAL_ROOT_SLOTS.get(DEITY_SLOT) ?? [];
  return neededBy.some((option) => rollOptions.includes(option));
}
