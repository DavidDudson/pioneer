import { ContentPackId, ContentText, PackId } from '@pioneer/rules/sdk';
import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { HomebrewPack } from './homebrew-pack';

const ById = z.object({ id: ContentPackId });

export const CreateHomebrewPackBody = z.object({ title: ContentText, slug: PackId });
export type CreateHomebrewPackBody = z.infer<typeof CreateHomebrewPackBody>;

/** The homebrew pack HTTP API, shared by `homebrew-infrastructure` and `homebrew-feature`. */
export const HomebrewContract = {
  /** The actor's own packs, newest first. */
  list: new Endpoint({
    method: HttpMethod.Get,
    path: '/homebrew/packs',
    params: NoParams,
    query: NoQuery,
    body: NoBody,
    response: z.array(HomebrewPack.codec),
  }),
  /** One of the actor's packs; someone else's is a 404. */
  get: new Endpoint({
    method: HttpMethod.Get,
    path: '/homebrew/packs/:id',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: HomebrewPack.codec,
  }),
  /** A new empty pack, private, owned by the actor. A slug already in use is a 409. */
  create: new Endpoint({
    method: HttpMethod.Post,
    path: '/homebrew/packs',
    params: NoParams,
    query: NoQuery,
    body: CreateHomebrewPackBody,
    response: HomebrewPack.codec,
  }),
} as const;
