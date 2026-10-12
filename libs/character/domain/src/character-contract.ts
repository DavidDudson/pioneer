import { AncestryId } from '@pioneer/rules/sdk';
import { Endpoint, HttpMethod, listQuery, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Character } from './character';
import { SheetDeity } from './character-deity';
import { CharacterId, CharacterName } from './character-fields';
import { CharacterLanguages } from './character-languages';
import { PatchCharacterBody } from './character-patch';
import { CharacterSlot } from './character-slot';
import { ClearedPick } from './dependent-picks';
import { SetSheetModeBody, SheetModeChoice } from './sheet-mode';

const ById = z.object({ id: CharacterId });

/** The only orders the character list supports; each is backed by an index. */
export const CharacterSort = { CreatedAt: 'created-at', Name: 'name' } as const;
export type CharacterSort = ValueOf<typeof CharacterSort>;

export const CharacterListQuery = listQuery(CharacterSort, CharacterSort.CreatedAt);
export type CharacterListQuery = z.output<typeof CharacterListQuery>;

export const CreateCharacterBody = z.object({ name: CharacterName, ancestry: AncestryId });
export type CreateCharacterBody = z.infer<typeof CreateCharacterBody>;

/**
 * One character as its sheet reads it: the character, every slot it has with its status (#419), its languages (#470)
 * and its deity (#469), with the description the browser's content has no copy of. They are worked out from the picks
 * and the server's content on each read, never stored, so the character's wire stays inputs only.
 */
export const CharacterSheet = z.object({
  character: Character.codec,
  slots: z.array(CharacterSlot).readonly(),
  languages: CharacterLanguages,
  deity: SheetDeity.optional(),
});
export type CharacterSheet = z.output<typeof CharacterSheet>;

/**
 * A PATCH's answer: the sheet, and the picks the edit cleared because a slot they are within changed (a heritage of
 * the old ancestry). Reported once, here; a later read has no record of them.
 */
export const PatchedCharacterSheet = CharacterSheet.extend({ cleared: z.array(ClearedPick).readonly() });
export type PatchedCharacterSheet = z.output<typeof PatchedCharacterSheet>;

/** The character HTTP API, shared by `character-infrastructure` and `character-feature`. */
export const CharacterContract = {
  list: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters',
    params: NoParams,
    query: CharacterListQuery,
    body: NoBody,
    response: z.array(Character.codec),
  }),
  get: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CharacterSheet,
  }),
  create: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters',
    params: NoParams,
    query: NoQuery,
    body: CreateCharacterBody,
    response: Character.codec,
  }),
  patch: new Endpoint({
    method: HttpMethod.Patch,
    path: '/characters/:id',
    params: ById,
    query: NoQuery,
    body: PatchCharacterBody,
    response: PatchedCharacterSheet,
  }),
  /** The tab the signed-in user last had open on this character's sheet, if any. */
  sheetMode: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id/sheet-mode',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: SheetModeChoice,
  }),
  /** Remembers the tab the signed-in user switched to. Not a character edit: the version stays the same. */
  setSheetMode: new Endpoint({
    method: HttpMethod.Patch,
    path: '/characters/:id/sheet-mode',
    params: ById,
    query: NoQuery,
    body: SetSheetModeBody,
    response: SheetModeChoice,
  }),
} as const;
