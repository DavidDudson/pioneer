import type { ValueOf } from '@pioneer/shared/kernel';

import { CharacterPatchField } from './character-patch';

/** Every command that writes a character, as named in `audit.log.command`. */
export const CharacterCommand = {
  CreateCharacter: 'createCharacter',
  RenameCharacter: 'renameCharacter',
  SetLevel: 'setLevel',
  SelectSlot: 'selectSlot',
  ClearSlot: 'clearSlot',
  /** A character created from a Pathbuilder export, so an import reads apart from a manual create. */
  ImportPathbuilder: 'importPathbuilder',
} as const;
export type CharacterCommand = ValueOf<typeof CharacterCommand>;

/** The command each inline field edit runs as. */
export const PATCH_COMMANDS = {
  [CharacterPatchField.Name]: CharacterCommand.RenameCharacter,
  [CharacterPatchField.Level]: CharacterCommand.SetLevel,
  [CharacterPatchField.SelectSlot]: CharacterCommand.SelectSlot,
  [CharacterPatchField.ClearSlot]: CharacterCommand.ClearSlot,
} as const satisfies Record<CharacterPatchField, CharacterCommand>;
