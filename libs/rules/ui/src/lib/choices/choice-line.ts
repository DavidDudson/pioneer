import type { Attribute, Level, SlotKey } from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

/** Where a choice stands: as the character's slot statuses (character-model.md, "Choice slots"). */
export const ChoiceState = {
  Open: 'open',
  Filled: 'filled',
  Planned: 'planned',
  Hidden: 'hidden',
  Invalid: 'invalid',
} as const;
export type ChoiceState = ValueOf<typeof ChoiceState>;

/** What is picked: an attribute, for a boost, or the content's name. */
export type ChoiceSelection =
  | { readonly attribute: Attribute }
  /** A pick by name; `legacy` when its entry is from a pre-remaster book, `unsupported` when its pack is no longer in force. */
  | {
      readonly name: string;
      readonly legacy?: true;
      readonly unsupported?: true;
      /** The entries that replace this pick, when it is a legacy entry with newer versions. */
      readonly replacedBy?: readonly ChoiceReplacement[];
    };

/** An entry a pick can be changed to: its id, which is what the slot then picks, and its name. */
export interface ChoiceReplacement {
  readonly id: string;
  readonly name: string;
}

/** One choice as the sheet lists it. */
export interface ChoiceLine {
  readonly key: SlotKey;
  /** What the choice is: "Ancestry", "Level 5 boost", "Elf: Skill". */
  readonly label: MessageDescriptor;
  readonly state: ChoiceState;
  /** Undefined while empty, or when the pick has no name to show. */
  readonly selection: ChoiceSelection | undefined;
  /** The level a planned choice opens at, or a planned invalid one is flagged at. */
  readonly level: Level | undefined;
  /** Why an invalid choice is invalid. */
  readonly reason: MessageDescriptor | undefined;
}
