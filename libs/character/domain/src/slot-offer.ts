import { grantLookup, resolveGrants } from '@pioneer/rules/grants';
import type { ContentLookup, GrantResolution, OfferedOption } from '@pioneer/rules/grants';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import { Level, SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentRegistry } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import { boostContent, boostSets, flawSlots } from './attribute-boosts';
import type { BoostContent, BoostSet, BoostSlot, FlawSlot } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { CHARACTER_ROOT_SLOTS } from './character-slots';
import { skillContent } from './skill-content';
import type { SkillContent } from './skill-content';
import { SkillSlotKind, skillSlots } from './skill-training';
import type { GrantsAt, SkillReads, SkillSlot } from './skill-training';

/** A selection for a slot, as `selectSlot` asks for it. */
export interface SlotPick {
  readonly slot: SlotKey;
  readonly selection: ChoiceValue;
}

/**
 * The content a slot's offer is read from: entries by id and kind, how roll option namespaces read, and the boosts
 * of each ancestry, background and class, and the skills and Lores a skill slot offers.
 */
export interface SlotContent {
  readonly lookup: ContentLookup;
  readonly namespaces: NamespaceTable;
  readonly boosts: BoostContent;
  readonly skills: SkillContent;
}

/** The slot content a registry gives. */
export function slotContent(registry: ContentRegistry): SlotContent {
  return {
    lookup: grantLookup(registry),
    namespaces: registry.rollOptionNamespaces(),
    boosts: boostContent(registry),
    skills: skillContent(registry),
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

/** What slots are read against: the character's picks and the content. */
export interface SlotContext extends SlotContent {
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

/** The character's grants at `level` over `picks`, with its own slots as roots. */
export function resolveSlotsAt(level: Level, { picks, lookup, namespaces }: SlotContext): GrantResolution {
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

/** The character's picks, by slot. */
function picksOf(document: CharacterDocument): ReadonlyMap<SlotKey, ChoiceValue> {
  return new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value]));
}

/** What skill slots read: the skills and boosts content, and the character's grants at each level, each resolved once. */
export function skillReads(document: CharacterDocument, content: SlotContent): SkillReads {
  const context: SlotContext = { ...content, picks: picksOf(document) };
  const resolved = new Map<Level, GrantResolution>();
  const grantsAt: GrantsAt = (level) => {
    const resolution = resolved.get(level) ?? resolveSlotsAt(level, context);
    resolved.set(level, resolution);
    return resolution;
  };
  return { skills: content.skills, boosts: content.boosts, grantsAt };
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

/** The voluntary flaw slot `slot` and the character's other flaw slots, if it is one the character has. */
interface FlawSlotIn {
  readonly slots: readonly FlawSlot[];
  readonly flaw: FlawSlot;
}

function flawSlotIn(document: CharacterDocument, boosts: BoostContent, slot: SlotKey): FlawSlotIn | undefined {
  const slots = flawSlots(document, boosts);
  const flaw = slots.find((each) => each.key === slot);
  return flaw === undefined ? undefined : { slots, flaw };
}

/** Why `selection` can't go in the flaw slot: neither the ancestry nor another voluntary flaw may lower it already. */
function flawRefusal({ slots, flaw }: FlawSlotIn, selection: ChoiceValue): SlotRefusal | undefined {
  if (!flaw.options.some((attribute) => attribute === selection)) {
    return NOT_OFFERED;
  }
  const taken = slots.some((other) => other.key !== flaw.key && other.pick === selection);
  return taken ? { field: SlotRefusalField.Selection, message: message('character.validation.flawTaken') } : undefined;
}

/** The refusal for each reason a loaded skill isn't on offer. */
const SKILL_REFUSALS: Readonly<Record<SkillSlotKind, SlotRefusal>> = {
  [SkillSlotKind.Training]: {
    field: SlotRefusalField.Selection,
    message: message('character.validation.skillTrained'),
  },
  [SkillSlotKind.Increase]: {
    field: SlotRefusalField.Selection,
    message: message('character.validation.skillRankCapped'),
  },
};

/**
 * Why `selection` can't go in the skill slot, read with the slot itself empty: a trained skill slot takes a skill or
 * Lore not trained yet, a skill increase one it may raise a rank at its level.
 */
function skillRefusal(slot: SkillSlot, skills: SkillContent, selection: ChoiceValue): SlotRefusal | undefined {
  if (slot.options.some((skill) => skill.id === selection)) {
    return undefined;
  }
  return skills.skills.some((skill) => skill.id === selection) ? SKILL_REFUSALS[slot.kind] : NOT_OFFERED;
}

/** The skill slot `slot`, read with its own pick left out, if it is one the character has at some level. */
function skillSlotIn(document: CharacterDocument, content: SlotContent, slot: SlotKey): SkillSlot | undefined {
  const { [slot]: _own, ...choices } = document.build.choices;
  const without: CharacterDocument = { ...document, build: { ...document.build, choices } };
  return skillSlots(without, skillReads(without, content)).find((each) => each.key === slot);
}

/**
 * Why `selection` can't go in `slot`, a root or `ChoiceSet` slot: it must be open at some level up to 20, and offer
 * `selection` there. The slot's own pick is left out, so it is checked as if empty; the other picks stay, so a slot an
 * earlier pick opened is found.
 */
function grantRefusal(
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
    const options = offerAt(resolveSlotsAt(level, context), slot);
    if (options?.some((option) => option.value === selection) === true) {
      return undefined;
    }
    open ||= options !== undefined;
  }
  return open ? NOT_OFFERED : { field: SlotRefusalField.Slot, message: message('character.validation.slotNotOpen') };
}

/**
 * Why `selection` can't go in `slot`, or undefined when it can. A boost slot takes an attribute its boost allows and
 * no other boost of its set raises; a voluntary flaw slot, one neither its ancestry nor another flaw lowers; a skill
 * slot, a skill or Lore it may train or raise. Any other slot must offer `selection` at some level up to 20.
 */
export function slotRefusal(
  document: CharacterDocument,
  content: SlotContent,
  pick: SlotPick,
): SlotRefusal | undefined {
  const boost = boostSlotIn(document, content.boosts, pick.slot);
  if (boost !== undefined) {
    return boostRefusal(boost, pick.selection);
  }
  const flaw = flawSlotIn(document, content.boosts, pick.slot);
  if (flaw !== undefined) {
    return flawRefusal(flaw, pick.selection);
  }
  const skill = skillSlotIn(document, content, pick.slot);
  return skill === undefined
    ? grantRefusal(document, content, pick)
    : skillRefusal(skill, content.skills, pick.selection);
}

/**
 * What one of the character's own slots offers over its other picks, by name: every background, or the heritages of
 * its ancestry and the versatile ones. Empty for a slot that isn't one of its own.
 */
export function rootSlotOptions(
  document: CharacterDocument,
  content: SlotContent,
  slot: SlotKey,
): readonly OfferedOption[] {
  const picks = picksOf(document);
  const { rootSlots } = resolveSlotsAt(Level.parse(document.level), { ...content, picks });
  return rootSlots.find((each) => each.key === slot)?.options ?? [];
}
