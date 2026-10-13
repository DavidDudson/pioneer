import { ContentPackId, ContentText, PackId, PackVisibility } from '@pioneer/rules/sdk';
import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { HomebrewPack } from './homebrew-pack';

const ById = z.object({ id: ContentPackId });

export const CreateHomebrewPackBody = z.object({
  title: ContentText,
  slug: PackId,
});
export type CreateHomebrewPackBody = z.infer<typeof CreateHomebrewPackBody>;

export const SetPackVisibilityBody = z.object({
  visibility: z.enum(PackVisibility),
});
export type SetPackVisibilityBody = z.infer<typeof SetPackVisibilityBody>;

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
  /** A pack the actor may read: their own, or one shared with them. Any other is a 404. */
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
  /**
   * Who may read the pack. Owner only: someone who can see the pack but does not own it gets 403, anyone else 404.
   * Making it private while campaigns still enable it is a 409 that names them.
   */
  setVisibility: new Endpoint({
    method: HttpMethod.Patch,
    path: '/homebrew/packs/:id/visibility',
    params: ById,
    query: NoQuery,
    body: SetPackVisibilityBody,
    response: HomebrewPack.codec,
  }),
} as const;
