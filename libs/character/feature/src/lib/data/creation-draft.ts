import {
  BACKGROUND_SLOT,
  Character,
  CharacterId,
  CharacterName,
  CLASS_SLOT,
  HERITAGE_SLOT,
} from '@pioneer/character/domain';
import { AncestryId, ChoiceValue } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import { UserId } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';

/** The query parameters that hold a character in the making, by the part of the character each names. */
export const DraftField = {
  Name: 'name',
  Ancestry: 'ancestry',
  Heritage: 'heritage',
  Background: 'background',
  Class: 'class',
  Subclass: 'subclass',
} as const;
export type DraftField = (typeof DraftField)[keyof typeof DraftField];

/** What the origin steps of the creation stepper have collected so far; '' for a part not chosen yet. */
export type CreationDraft = Readonly<Record<DraftField, string>>;

/** The name a draft character carries until its player has typed one: it is never saved. */
const UNNAMED = CharacterName.parse('Unnamed');
/** A draft is read, never stored, so its character takes any id and owner. */
const DRAFT_ID = CharacterId.parse('00000000-0000-4000-8000-000000000000');
const DRAFT_OWNER = UserId.parse('00000000-0000-4000-8000-000000000001');

/** A draft read from the query parameters `read` answers; a part missing is ''. */
export function draftOf(read: (field: DraftField) => string | undefined): CreationDraft {
  return {
    name: read(DraftField.Name) ?? '',
    ancestry: read(DraftField.Ancestry) ?? '',
    heritage: read(DraftField.Heritage) ?? '',
    background: read(DraftField.Background) ?? '',
    class: read(DraftField.Class) ?? '',
    subclass: read(DraftField.Subclass) ?? '',
  };
}

/** Whether `name` is one a character may have. */
export function validName(name: string): boolean {
  return CharacterName.safeParse(name).success;
}

/** What the draft picks in `slots`, in the order a character needs them: a pick may depend on those before it. */
export function draftPicks(
  draft: CreationDraft,
  subclassSlot: SlotKey | undefined,
): readonly (readonly [SlotKey, ChoiceValue])[] {
  const wanted: readonly (readonly [SlotKey | undefined, string])[] = [
    [HERITAGE_SLOT, draft.heritage],
    [BACKGROUND_SLOT, draft.background],
    [CLASS_SLOT, draft.class],
    [subclassSlot, draft.subclass],
  ];
  return wanted.flatMap(([slot, value]) => {
    const choice = ChoiceValue.safeParse(value);
    return slot === undefined || value === '' || !choice.success ? [] : [[slot, choice.data] as const];
  });
}

/**
 * The character the draft would make, in memory, so the options each step offers are read over what is picked before
 * it; undefined until an ancestry is. It is never saved.
 */
export function draftCharacter(draft: CreationDraft, now: Temporal.Instant): Character | undefined {
  const ancestry = AncestryId.safeParse(draft.ancestry);
  if (!ancestry.success) {
    return undefined;
  }
  const name = CharacterName.safeParse(draft.name);
  const choices = Object.fromEntries(draftPicks(draft, undefined));
  return Character.create({
    id: DRAFT_ID,
    ownerId: DRAFT_OWNER,
    name: name.success ? name.data : UNNAMED,
    ancestry: ancestry.data,
    choices,
    now,
  });
}
