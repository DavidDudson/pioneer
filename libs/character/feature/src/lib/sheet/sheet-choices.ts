import { SlotStatus, SlotSubjectKind } from '@pioneer/character/domain';
import type { CharacterSlot, SlotSubject } from '@pioneer/character/domain';
import type { ContentLookup } from '@pioneer/rules/grants';
import { AttributeSchema, ContentId, ContentKind, SlotRank } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentText } from '@pioneer/rules/sdk';
import { ChoiceState } from '@pioneer/rules/ui';
import type { ChoiceLine, ChoiceReplacement, ChoiceSelection } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { BOOST_LABEL_KEYS } from './sheet-attributes';
import { SKILL_SLOT_LABEL_KEYS } from './sheet-skill-sources';

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

/** What the sheet flags on a pick. */
interface PickFlags {
  readonly legacy?: true;
  readonly unsupported?: true;
  readonly replacedBy?: readonly ChoiceReplacement[];
}

/** The flags of the pick's entry: from a pre-remaster book, from a pack no longer in force. */
function flagsOfPick(selection: ChoiceValue, lookup: ContentLookup | undefined): PickFlags {
  const entry = ContentId.safeParse(selection);
  const facts = entry.success ? lookup?.entry(entry.data)?.facts : undefined;
  return {
    ...(facts?.legacy === true ? { legacy: true as const } : {}),
    ...(facts?.unsupported === true ? { unsupported: true as const } : {}),
    ...(facts?.replacedBy === undefined ? {} : { replacedBy: facts.replacedBy.map(({ id, name }) => ({ id, name })) }),
  };
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
  return { name, ...flagsOfPick(selection, lookup) };
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
