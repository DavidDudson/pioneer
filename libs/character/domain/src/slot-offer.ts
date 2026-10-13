import type { GrantResolution, OfferedOption } from '@pioneer/rules/grants';
import { Level, SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { FeatPickProblem } from './feat-content';
import { featPickProblem, prerequisiteReads, withoutPick } from './feat-slots';
import { LanguagePickProblem, languageSlots, problemOf } from './languages';
import type { LanguageSlot } from './languages';
import type { SkillContent } from './skill-content';
import { SkillSlotKind, skillSlots } from './skill-training';
import type { SkillSlot } from './skill-training';
import { languageReads, picksOf, preparedReads, resolveSlotsAt, skillReads } from './slot-reads';
import type { SlotContent, SlotContext } from './slot-reads';
import { boostRefusal, boostSlotIn, flawRefusal, flawSlotIn, NOT_OFFERED, SlotRefusalField } from './slot-refusals';
import type { SlotRefusal } from './slot-refusals';
import { isSpellPickKey, spellPickRefusal } from './spell-pick-refusal';

export { SlotRefusalField, type SlotRefusal } from './slot-refusals';
export {
  languageReads,
  preparedReads,
  resolveSlotsAt,
  skillReads,
  type SlotContent,
  slotContent,
  type SlotContext,
} from './slot-reads';

/** A selection for a slot, as `selectSlot` asks for it. */
export interface SlotPick {
  readonly slot: SlotKey;
  readonly selection: ChoiceValue;
}

/**
 * What `slot` offers at the level `resolution` was read at; undefined when the character hasn't the slot there. The
 * slot's own pick is left out of the picks, so it is never answered: a `ChoiceSet` slot is among the open ones.
 */
function offerAt(resolution: GrantResolution, slot: SlotKey): readonly OfferedOption[] | undefined {
  const slots = [...resolution.rootSlots, ...resolution.open];
  return slots.find((each) => each.key === slot)?.options;
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
/** The refusal for each way a feat on offer at some level can't go in its slot. */
const FEAT_REFUSALS: Readonly<Record<FeatPickProblem, SlotRefusal>> = {
  [FeatPickProblem.TooHigh]: NOT_OFFERED,
  [FeatPickProblem.Prerequisites]: {
    field: SlotRefusalField.Selection,
    message: message('character.validation.prerequisitesNotMet'),
  },
};

/**
 * Why a feat can't go in a feat slot (#466), read with the slot itself empty at the level the slot opens: it must be
 * no higher than that level, and the character must meet its prerequisites there or they must be unknown. Undefined
 * for any other slot.
 */
function featRefusal(document: CharacterDocument, content: SlotContent, pick: SlotPick): SlotRefusal | undefined {
  const problem = featPickProblem(prerequisiteReads(withoutPick(document, pick.slot), content), pick);
  return problem === undefined ? undefined : FEAT_REFUSALS[problem];
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
      return featRefusal(document, content, { slot, selection });
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
