import { grantLookup, resolveGrants } from '@pioneer/rules/grants';
import type { ContentLookup, GrantResolution, OfferedOption } from '@pioneer/rules/grants';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import { Level, SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentRegistry } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { boostContent } from './attribute-boosts';
import type { BoostContent } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { CHARACTER_ROOT_SLOTS } from './character-slots';
import { languageContent } from './language-content';
import type { LanguageContent } from './language-content';
import type { LanguageReads } from './language-levels';
import { LanguagePickProblem, languageSlots, problemOf } from './languages';
import type { LanguageSlot } from './languages';
import type { PreparedReads } from './prepared-spells';
import { skillContent } from './skill-content';
import type { SkillContent } from './skill-content';
import { SkillSlotKind, skillSlots } from './skill-training';
import type { GrantsAt, SkillReads, SkillSlot } from './skill-training';
import { boostRefusal, boostSlotIn, flawRefusal, flawSlotIn, NOT_OFFERED, SlotRefusalField } from './slot-refusals';
import type { SlotRefusal } from './slot-refusals';
import { spellContent } from './spell-content';
import type { SpellContent } from './spell-content';
import { isSpellPickKey, spellPickRefusal } from './spell-pick-refusal';

export { SlotRefusalField, type SlotRefusal } from './slot-refusals';

/** A selection for a slot, as `selectSlot` asks for it. */
export interface SlotPick {
  readonly slot: SlotKey;
  readonly selection: ChoiceValue;
}

/**
 * The content a slot's offer is read from: entries by id and kind, how roll option namespaces read, and the boosts
 * of each ancestry, background and class, the skills and Lores a skill slot offers, the languages, and the spells a
 * prepared slot offers.
 */
export interface SlotContent {
  readonly lookup: ContentLookup;
  readonly namespaces: NamespaceTable;
  readonly boosts: BoostContent;
  readonly skills: SkillContent;
  readonly languages: LanguageContent;
  readonly spells: SpellContent;
}

/** The slot content a registry gives. */
export function slotContent(registry: ContentRegistry): SlotContent {
  return {
    lookup: grantLookup(registry),
    namespaces: registry.rollOptionNamespaces(),
    boosts: boostContent(registry),
    skills: skillContent(registry),
    languages: languageContent(registry),
    spells: spellContent(registry),
  };
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

/** Grants already resolved, by content, document and level: documents and content are never changed in place. */
const RESOLVED = new WeakMap<SlotContent, WeakMap<CharacterDocument, Map<Level, GrantResolution>>>();

function resolvedFor(document: CharacterDocument, content: SlotContent): Map<Level, GrantResolution> {
  const byDocument = RESOLVED.get(content) ?? new WeakMap<CharacterDocument, Map<Level, GrantResolution>>();
  RESOLVED.set(content, byDocument);
  const resolved = byDocument.get(document) ?? new Map<Level, GrantResolution>();
  byDocument.set(document, resolved);
  return resolved;
}

/**
 * What skill slots read: the skills and boosts content, and the character's grants at each level, each resolved once
 * for the same content and document, however many reads ask.
 */
export function skillReads(document: CharacterDocument, content: SlotContent): SkillReads {
  const context: SlotContext = { ...content, picks: picksOf(document) };
  const resolved = resolvedFor(document, content);
  const grantsAt: GrantsAt = (level) => {
    const resolution = resolved.get(level) ?? resolveSlotsAt(level, context);
    resolved.set(level, resolution);
    return resolution;
  };
  return { skills: content.skills, boosts: content.boosts, grantsAt };
}

/** What language slots read: the languages content and namespaces, and the skill reads, grants resolved once. */
export function languageReads(document: CharacterDocument, content: SlotContent): LanguageReads {
  return { languages: content.languages, namespaces: content.namespaces, skills: skillReads(document, content) };
}

/** Every character level, highest first: most slots are open at 20th, so a valid pick is usually found at once. */
function levelsDown(): Level[] {
  const count = CHARACTER_LEVEL_MAX - CHARACTER_LEVEL_MIN + 1;
  return Array.from({ length: count }, (_unused, index) => Level.parse(CHARACTER_LEVEL_MAX - index));
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
  const named = skills.skill(selection);
  if (named === undefined) {
    return NOT_OFFERED;
  }
  return slot.options.some((skill) => skill.id === named.id) ? undefined : SKILL_REFUSALS[slot.kind];
}

/** The skill slot `slot`, read with its own pick left out, if it is one the character has at some level. */
function skillSlotIn(document: CharacterDocument, content: SlotContent, slot: SlotKey): SkillSlot | undefined {
  const { [slot]: _own, ...choices } = document.build.choices;
  const without: CharacterDocument = { ...document, build: { ...document.build, choices } };
  return skillSlots(without, skillReads(without, content)).find((each) => each.key === slot);
}

/** Every language slot's key starts so: `language:1:0`, `language:<entry>:<rule>:0`. */
const LANGUAGE_SLOT_PREFIX = 'language:';

/** The refusal for each reason a loaded language isn't on offer. */
const LANGUAGE_REFUSALS: Readonly<Record<LanguagePickProblem, SlotRefusal>> = {
  [LanguagePickProblem.Known]: {
    field: SlotRefusalField.Selection,
    message: message('character.validation.languageKnown'),
  },
  [LanguagePickProblem.Rare]: NOT_OFFERED,
};

/**
 * Why `selection` can't go in the language slot, read with the slot itself empty: a language the character doesn't
 * know yet, no rarer than the slot offers unless the ancestry lists it.
 */
function languageRefusal(slot: LanguageSlot, content: SlotContent, selection: ChoiceValue): SlotRefusal | undefined {
  const named = content.languages.language(selection);
  if (named === undefined) {
    return NOT_OFFERED;
  }
  if (slot.options.some((language) => language.id === named.id)) {
    return undefined;
  }
  return LANGUAGE_REFUSALS[problemOf(named, slot.known)];
}

/** The language slot `slot`, read with its own pick left out, if it is one the character has at some level. */
function languageSlotIn(document: CharacterDocument, content: SlotContent, slot: SlotKey): LanguageSlot | undefined {
  const { [slot]: _own, ...choices } = document.build.choices;
  const without: CharacterDocument = { ...document, build: { ...document.build, choices } };
  return languageSlots(without, languageReads(without, content)).find((each) => each.key === slot);
}
/** What prepared slots read: the spells, and the character's grants at its level over every pick it holds. */
export function preparedReads(document: CharacterDocument, content: SlotContent): PreparedReads {
  const level = Level.parse(document.level);
  const resolved = resolvedFor(document, content);
  const resolution = resolved.get(level) ?? resolveSlotsAt(level, { ...content, picks: picksOf(document) });
  resolved.set(level, resolution);
  return { spells: content.spells, resolution };
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
 * Why `selection` can't go in a slot its key names the kind of: a prepared or repertoire slot, a signature slot, a
 * language slot, else a root or `ChoiceSet` slot.
 */
function keyedRefusal(document: CharacterDocument, content: SlotContent, pick: SlotPick): SlotRefusal | undefined {
  if (isSpellPickKey(pick.slot)) {
    return spellPickRefusal(document, preparedReads(document, content), pick);
  }
  const language = pick.slot.startsWith(LANGUAGE_SLOT_PREFIX)
    ? languageSlotIn(document, content, pick.slot)
    : undefined;
  return language === undefined
    ? grantRefusal(document, content, pick)
    : languageRefusal(language, content, pick.selection);
}

/**
 * Why `selection` can't go in `slot`, or undefined when it can. A boost slot takes an attribute its boost allows and
 * no other boost of its set raises; a voluntary flaw slot, one neither its ancestry nor another flaw lowers; a skill
 * slot, a skill or Lore it may train or raise; a language slot, a language not known yet that it offers; a prepared
 * or repertoire slot, a spell it offers at the character's level; a signature slot, a spell its repertoire knows at
 * its rank. Any other slot must offer `selection` at some level up to 20.
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
  if (skill !== undefined) {
    return skillRefusal(skill, content.skills, pick.selection);
  }
  return keyedRefusal(document, content, pick);
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
