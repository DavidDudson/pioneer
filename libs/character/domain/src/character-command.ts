import type { ValueOf } from '@pioneer/shared/kernel';

import { CharacterPatchField } from './character-patch';
import { PlayCommandField } from './play-state';

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
  BuyItem: 'buyItem',
  GiftKit: 'giftKit',
  BuyKit: 'buyKit',
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
  /** Play state (#343, #344): written to `character_play`, never to the build. */
  Damage: 'damage',
  Heal: 'heal',
  SetHp: 'setHp',
  SetTempHp: 'setTempHp',
  RecoveryCheck: 'recoveryCheck',
  SetDying: 'setDying',
  SetWounded: 'setWounded',
  SetDoomed: 'setDoomed',
  SetAppearance: 'setAppearance',
  SetPersonality: 'setPersonality',
} as const;
export type CharacterCommand = ValueOf<typeof CharacterCommand>;

/** The command each inline field edit runs as. */
export const PATCH_COMMANDS = {
  [CharacterPatchField.Name]: CharacterCommand.RenameCharacter,
  [CharacterPatchField.Level]: CharacterCommand.SetLevel,
  [CharacterPatchField.SelectSlot]: CharacterCommand.SelectSlot,
  [CharacterPatchField.ClearSlot]: CharacterCommand.ClearSlot,
  [CharacterPatchField.GiftItem]: CharacterCommand.GiftItem,
  [CharacterPatchField.BuyItem]: CharacterCommand.BuyItem,
  [CharacterPatchField.GiftKit]: CharacterCommand.GiftKit,
  [CharacterPatchField.BuyKit]: CharacterCommand.BuyKit,
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
  [CharacterPatchField.SetAppearance]: CharacterCommand.SetAppearance,
  [CharacterPatchField.SetPersonality]: CharacterCommand.SetPersonality,
} as const satisfies Record<CharacterPatchField, CharacterCommand>;

/** The command each play-state edit runs as. */
export const PLAY_COMMANDS = {
  [PlayCommandField.Damage]: CharacterCommand.Damage,
  [PlayCommandField.Heal]: CharacterCommand.Heal,
  [PlayCommandField.SetHp]: CharacterCommand.SetHp,
  [PlayCommandField.SetTempHp]: CharacterCommand.SetTempHp,
  [PlayCommandField.RecoveryCheck]: CharacterCommand.RecoveryCheck,
  [PlayCommandField.SetDying]: CharacterCommand.SetDying,
  [PlayCommandField.SetWounded]: CharacterCommand.SetWounded,
  [PlayCommandField.SetDoomed]: CharacterCommand.SetDoomed,
} as const satisfies Record<PlayCommandField, CharacterCommand>;
