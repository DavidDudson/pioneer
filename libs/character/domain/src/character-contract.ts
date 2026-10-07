import { AncestryId } from '@pioneer/rules/sdk';
import { Endpoint, HttpMethod, NoBody, NoParams } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { Character } from './character';
import { CharacterId, CharacterNameSchema } from './character-fields';
import { PatchCharacterBody } from './character-patch';

const ById = z.object({ id: CharacterId });

export const CreateCharacterBody = z.object({ name: CharacterNameSchema, ancestry: AncestryId });
export type CreateCharacterBody = z.infer<typeof CreateCharacterBody>;

/** The character HTTP API, shared by `character-infrastructure` and `character-feature`. */
export const CharacterContract = {
  list: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters',
    params: NoParams,
    body: NoBody,
    response: z.array(Character.codec),
  }),
  get: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id',
    params: ById,
    body: NoBody,
    response: Character.codec,
  }),
  create: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters',
    params: NoParams,
    body: CreateCharacterBody,
    response: Character.codec,
  }),
  patch: new Endpoint({
    method: HttpMethod.Patch,
    path: '/characters/:id',
    params: ById,
    body: PatchCharacterBody,
    response: Character.codec,
  }),
} as const;
