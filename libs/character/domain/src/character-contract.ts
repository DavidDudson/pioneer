import { AncestryId } from '@pioneer/rules/sdk';
import { Endpoint, HttpMethod, listQuery, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { Character } from './character';
import { CharacterId, CharacterName } from './character-fields';
import { PatchCharacterBody } from './character-patch';

const ById = z.object({ id: CharacterId });

/** The only orders the character list supports; each is backed by an index. */
export const CharacterSort = { CreatedAt: 'created-at', Name: 'name' } as const;
export type CharacterSort = ValueOf<typeof CharacterSort>;

export const CharacterListQuery = listQuery(CharacterSort, CharacterSort.CreatedAt);
export type CharacterListQuery = z.output<typeof CharacterListQuery>;

export const CreateCharacterBody = z.object({ name: CharacterName, ancestry: AncestryId });
export type CreateCharacterBody = z.infer<typeof CreateCharacterBody>;

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
    response: Character.codec,
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
    response: Character.codec,
  }),
} as const;
