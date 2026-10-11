import { SlotStatus, SlotSubjectKind } from '@pioneer/character/domain';
import type { CharacterSlot, SlotSubject } from '@pioneer/character/domain';
import { AttributeSchema, ContentKind } from '@pioneer/rules/sdk';
import type { ChoiceValue } from '@pioneer/rules/sdk';
import { ChoiceState } from '@pioneer/rules/ui';
import type { ChoiceLine, ChoiceSelection } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { BOOST_LABEL_KEYS } from './sheet-attributes';
import { SKILL_SLOT_LABEL_KEYS } from './sheet-skills';

const STATES: Readonly<Record<SlotStatus, ChoiceState>> = {
  [SlotStatus.Open]: ChoiceState.Open,
  [SlotStatus.Filled]: ChoiceState.Filled,
  [SlotStatus.Planned]: ChoiceState.Planned,
  [SlotStatus.Hidden]: ChoiceState.Hidden,
  [SlotStatus.Invalid]: ChoiceState.Invalid,
};

/** What each of the character's own slots is called. */
const ROOT_LABEL_KEYS: ReadonlyMap<ContentKind, string> = new Map([
  [ContentKind.Ancestry, 'rules.choices.slot.ancestry'],
  [ContentKind.Heritage, 'rules.choices.slot.heritage'],
  [ContentKind.Background, 'rules.choices.slot.background'],
  [ContentKind.Class, 'rules.choices.slot.class'],
]);

const FLAW_LABEL = 'rules.choices.slot.flaw';
const UNKNOWN_LABEL = 'rules.choices.slot.unknown';

/** Slots whose pick is an attribute. */
const ATTRIBUTE_SUBJECTS: ReadonlySet<SlotSubjectKind> = new Set([SlotSubjectKind.Boost, SlotSubjectKind.Flaw]);

/** "Ancestry", "Level 5 boost", "Voluntary flaw", "Level 3 skill increase", "Elf: Skill" ("Elf choice" without a prompt). */
function labelOf(subject: SlotSubject | undefined): MessageDescriptor {
  switch (subject?.kind) {
    case SlotSubjectKind.Root: {
      return message(ROOT_LABEL_KEYS.get(subject.content) ?? UNKNOWN_LABEL);
    }
    case SlotSubjectKind.Boost: {
      return message(BOOST_LABEL_KEYS[subject.source], { level: subject.level });
    }
    case SlotSubjectKind.Flaw: {
      return message(FLAW_LABEL);
    }
    case SlotSubjectKind.Skill: {
      return message(SKILL_SLOT_LABEL_KEYS[subject.source], { level: subject.level });
    }
    case SlotSubjectKind.Choice: {
      if (subject.entryName === undefined) {
        return message(UNKNOWN_LABEL);
      }
      return subject.prompt === undefined
        ? message('rules.choices.slot.choiceOf', { entry: subject.entryName })
        : message('rules.choices.slot.choice', { entry: subject.entryName, prompt: subject.prompt });
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

/** A boost's or flaw's pick is its attribute; anything else shows by the name the server gave it, or not at all. */
function selectionOf(slot: CharacterSlot): ChoiceSelection | undefined {
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
  return name === undefined ? undefined : { name };
}

function lineOf(slot: CharacterSlot): ChoiceLine {
  return {
    key: slot.key,
    label: labelOf('subject' in slot ? slot.subject : undefined),
    state: STATES[slot.status],
    selection: selectionOf(slot),
    level: 'level' in slot ? slot.level : undefined,
    reason: slot.status === SlotStatus.Invalid ? slot.reason : undefined,
  };
}

/** A planned slot with nothing picked is the plan's empty space, not a choice to flag. */
function isShown(slot: CharacterSlot): boolean {
  return slot.status !== SlotStatus.Planned || slot.selection !== undefined;
}

/**
 * The sheet's choices: every slot the server read, in its order, but the empty ones above the character's level. A
 * planned pick and an invalid one stay, with the level and reason (#419).
 */
export function sheetChoices(slots: readonly CharacterSlot[]): readonly ChoiceLine[] {
  return slots.filter((slot) => isShown(slot)).map((slot) => lineOf(slot));
}
