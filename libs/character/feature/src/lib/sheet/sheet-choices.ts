import { characterGrants, listedChoices, SlotStatus, SlotSubjectKind } from '@pioneer/character/domain';
import type { Character, CharacterSlot, SlotSubject } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { FIRST_TAKE } from '@pioneer/rules/grants';
import type { ContentLookup, EntryFacts } from '@pioneer/rules/grants';
import { AttributeSchema, ContentId, ContentKind, SlotRank } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentRegistry, ContentText, SlotKey } from '@pioneer/rules/sdk';
import { ChoiceState } from '@pioneer/rules/ui';
import type { ChoiceLine, ChoiceSelection, SlotPickerFacts, SlotPickerRow } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { BOOST_LABEL_KEYS } from './sheet-attributes';
import { SKILL_SLOT_LABEL_KEYS } from './sheet-skill-sources';
import { sheetSlotContent } from './sheet-slot-content';

const STATES: Readonly<Record<SlotStatus, ChoiceState>> = {
  [SlotStatus.Open]: ChoiceState.Open,
  [SlotStatus.Filled]: ChoiceState.Filled,
  [SlotStatus.Planned]: ChoiceState.Planned,
  [SlotStatus.Hidden]: ChoiceState.Hidden,
  [SlotStatus.Invalid]: ChoiceState.Invalid,
};

/** Slots labelled by their kind: a voluntary flaw, a prepared or repertoire spell slot, a signature spell. */
type KindSubject = Extract<SlotSubject, { kind: 'flaw' | 'spell' | 'signature' }>;

/** A `ChoiceSet` slot whose entry is named. */
type ChoiceSubject = Extract<SlotSubject, { kind: 'choice' }> & { readonly entryName: ContentText };

/** What each of the character's own slots is called. */
const ROOT_LABEL_KEYS: ReadonlyMap<ContentKind, string> = new Map([
  [ContentKind.Ancestry, 'rules.choices.slot.ancestry'],
  [ContentKind.Heritage, 'rules.choices.slot.heritage'],
  [ContentKind.Background, 'rules.choices.slot.background'],
  [ContentKind.Class, 'rules.choices.slot.class'],
  [ContentKind.Deity, 'rules.choices.slot.deity'],
]);

const UNKNOWN_LABEL = 'rules.choices.slot.unknown';

/** Slots whose pick is an attribute. */
const ATTRIBUTE_SUBJECTS: ReadonlySet<SlotSubjectKind> = new Set([SlotSubjectKind.Boost, SlotSubjectKind.Flaw]);

/** "Voluntary flaw", "Cantrip", "3rd rank spell", "3rd rank signature spell". */
function kindLabelOf(subject: KindSubject): MessageDescriptor {
  if (subject.kind === SlotSubjectKind.Flaw) {
    return message('rules.choices.slot.flaw');
  }
  if (subject.kind === SlotSubjectKind.Signature) {
    return message('rules.choices.slot.rankSignatureSpell', { rank: subject.rank });
  }
  return subject.rank === SlotRank.Cantrip
    ? message('rules.choices.slot.cantripSpell')
    : message('rules.choices.slot.rankSpell', { rank: subject.rank });
}

/** "Elf: Skill", "Elf choice"; on a later take of a repeatable feat, "Domain Initiate (take 2): Select a domain.". */
function choiceLabelOf(subject: ChoiceSubject): MessageDescriptor {
  const { entryName, prompt, take } = subject;
  if (take === undefined) {
    return prompt === undefined
      ? message('rules.choices.slot.choiceOf', { entry: entryName })
      : message('rules.choices.slot.choice', { entry: entryName, prompt });
  }
  return prompt === undefined
    ? message('rules.choices.slot.choiceOfTake', { entry: entryName, take })
    : message('rules.choices.slot.choiceTake', { entry: entryName, take, prompt });
}

/** "Ancestry", "Level 5 boost", "Voluntary flaw", "Level 3 skill increase", "Language from Multilingual", "Elf: Skill" ("Elf choice" without a prompt). */
function labelOf(subject: SlotSubject | undefined): MessageDescriptor {
  switch (subject?.kind) {
    case SlotSubjectKind.Root: {
      return message(ROOT_LABEL_KEYS.get(subject.content) ?? UNKNOWN_LABEL);
    }
    case SlotSubjectKind.Boost: {
      return message(BOOST_LABEL_KEYS[subject.source], { level: subject.level });
    }
    case SlotSubjectKind.Skill: {
      return message(SKILL_SLOT_LABEL_KEYS[subject.source], { level: subject.level });
    }
    case SlotSubjectKind.Language: {
      return subject.entryName === undefined
        ? message('rules.choices.slot.language', { level: subject.level })
        : message('rules.choices.slot.languageFrom', { entry: subject.entryName });
    }
    case SlotSubjectKind.Flaw:
    case SlotSubjectKind.Spell:
    case SlotSubjectKind.Signature: {
      return kindLabelOf(subject);
    }
    case SlotSubjectKind.Choice: {
      if (subject.entryName === undefined) {
        return message(UNKNOWN_LABEL);
      }
      return choiceLabelOf({ ...subject, entryName: subject.entryName });
    }
    case undefined: {
      return message(UNKNOWN_LABEL);
    }
    default: {
      const unreachable: never = subject;
      throw new TypeError(`Unhandled slot subject: ${JSON.stringify(unreachable)}`);
    }
  }
}

/** Whether the pick is an entry from a pre-remaster book. */
function isLegacyPick(selection: ChoiceValue, lookup: ContentLookup | undefined): boolean {
  const entry = ContentId.safeParse(selection);
  return entry.success && lookup?.entry(entry.data)?.facts?.legacy === true;
}

/** A boost's or flaw's pick is its attribute; anything else shows by the name the server gave it, or not at all. */
function selectionOf(slot: CharacterSlot, lookup: ContentLookup | undefined): ChoiceSelection | undefined {
  const selection: ChoiceValue | undefined = 'selection' in slot ? slot.selection : undefined;
  if (selection === undefined) {
    return undefined;
  }
  const attribute = AttributeSchema.safeParse(selection);
  const isAttribute = 'subject' in slot && ATTRIBUTE_SUBJECTS.has(slot.subject.kind);
  if (isAttribute && attribute.success) {
    return { attribute: attribute.data };
  }
  const name = 'selectionName' in slot ? slot.selectionName : undefined;
  if (name === undefined) {
    return undefined;
  }
  return isLegacyPick(selection, lookup) ? { name, legacy: true } : { name };
}

export function lineOf(slot: CharacterSlot, lookup?: ContentLookup): ChoiceLine {
  return {
    key: slot.key,
    label: labelOf('subject' in slot ? slot.subject : undefined),
    state: STATES[slot.status],
    selection: selectionOf(slot, lookup),
    level: 'level' in slot ? slot.level : undefined,
    reason: slot.status === SlotStatus.Invalid ? slot.reason : undefined,
  };
}

/** The spell slots the Spellcasting section shows under their entry instead (#478, #479). */
const SPELL_SUBJECTS: ReadonlySet<SlotSubjectKind> = new Set([SlotSubjectKind.Spell, SlotSubjectKind.Signature]);

/**
 * A planned slot with nothing picked is the plan's empty space, not a choice to flag. A prepared, repertoire or
 * signature spell slot shows under its entry in the Spellcasting section instead.
 */
function isShown(slot: CharacterSlot): boolean {
  if ('subject' in slot && SPELL_SUBJECTS.has(slot.subject.kind)) {
    return false;
  }
  return slot.status !== SlotStatus.Planned || slot.selection !== undefined;
}

/**
 * The sheet's choices: every slot the server read, in its order, but the empty ones above the character's level. A
 * planned pick and an invalid one stay, with the level and reason (#419); spell slots are left to the Spellcasting
 * section.
 */
export function sheetChoices(slots: readonly CharacterSlot[], lookup?: ContentLookup): readonly ChoiceLine[] {
  return slots.filter((slot) => isShown(slot)).map((slot) => lineOf(slot, lookup));
}

/** What an option's entry says of itself, as the slot picker's table shows it. */
function factsOf({ level, rarity, traits, description, legacy }: EntryFacts): SlotPickerFacts {
  return { level, rarity, traits, summary: description, ...(legacy === true ? { legacy } : {}) };
}

/** A `ChoiceSet` that lists its options, as the Choices section's picker for it reads it (#596). */
export interface SheetChoiceSlot {
  readonly key: SlotKey;
  /** "Domain Initiate: Select a domain." */
  readonly label: MessageDescriptor;
  readonly options: readonly SelectOption<string>[];
  /** What the table shows of each option: its name, and its source when the option names a content entry. */
  readonly rows: readonly SlotPickerRow[];
}

/**
 * The character's `ChoiceSet` slots that list their options, each offering what it offers at the character's level,
 * by the entry asking: Divine Font's font, Domain Initiate's domain (ADR-0050). A pick no longer offered shows by the
 * name the server read, as any inline pick's does.
 */
export function sheetChoiceSlots(registry: ContentRegistry, character: Character): readonly SheetChoiceSlot[] {
  const content = sheetSlotContent(registry);
  return listedChoices(characterGrants(character.document, content), content.lookup).map(({ slot, entryName }) => ({
    key: slot.key,
    label: labelOf({
      kind: SlotSubjectKind.Choice,
      entry: slot.origin.entry,
      entryName,
      prompt: slot.prompt,
      ...(slot.take === FIRST_TAKE ? {} : { take: slot.take }),
    }),
    options: slot.options.map((option) => ({ value: option.value, label: option.label })),
    rows: slot.options.map((option): SlotPickerRow => {
      const id = ContentId.safeParse(option.value);
      const entry = id.success ? content.lookup.entry(id.data) : undefined;
      return {
        id: option.value,
        name: option.label,
        sources: entry?.sources ?? [],
        facts: entry?.facts === undefined ? undefined : factsOf(entry.facts),
        disabledReason: undefined,
      };
    }),
  }));
}
