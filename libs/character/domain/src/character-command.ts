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
  GiftItem: 'giftItem',
  RemoveItem: 'removeItem',
  SetItemQuantity: 'setItemQuantity',
  MoveItem: 'moveItem',
  RenameItem: 'renameItem',
  CarryItem: 'carryItem',
  InvestItem: 'investItem',
  EtchRune: 'etchRune',
  EraseRune: 'eraseRune',
  TransferRune: 'transferRune',
  SetCoins: 'setCoins',
  GrantSpellAccess: 'grantSpellAccess',
  RevokeSpellAccess: 'revokeSpellAccess',
} as const;
export type CharacterCommand = ValueOf<typeof CharacterCommand>;

/** The command each inline field edit runs as. */
export const PATCH_COMMANDS = {
  [CharacterPatchField.Name]: CharacterCommand.RenameCharacter,
  [CharacterPatchField.Level]: CharacterCommand.SetLevel,
  [CharacterPatchField.SelectSlot]: CharacterCommand.SelectSlot,
  [CharacterPatchField.ClearSlot]: CharacterCommand.ClearSlot,
  [CharacterPatchField.GiftItem]: CharacterCommand.GiftItem,
  [CharacterPatchField.RemoveItem]: CharacterCommand.RemoveItem,
  [CharacterPatchField.SetItemQuantity]: CharacterCommand.SetItemQuantity,
  [CharacterPatchField.MoveItem]: CharacterCommand.MoveItem,
  [CharacterPatchField.RenameItem]: CharacterCommand.RenameItem,
  [CharacterPatchField.CarryItem]: CharacterCommand.CarryItem,
  [CharacterPatchField.InvestItem]: CharacterCommand.InvestItem,
  [CharacterPatchField.EtchRune]: CharacterCommand.EtchRune,
  [CharacterPatchField.EraseRune]: CharacterCommand.EraseRune,
  [CharacterPatchField.TransferRune]: CharacterCommand.TransferRune,
  [CharacterPatchField.SetCoins]: CharacterCommand.SetCoins,
  [CharacterPatchField.GrantSpellAccess]: CharacterCommand.GrantSpellAccess,
  [CharacterPatchField.RevokeSpellAccess]: CharacterCommand.RevokeSpellAccess,
} as const satisfies Record<CharacterPatchField, CharacterCommand>;
