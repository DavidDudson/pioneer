import {
  HomebrewPackService,
  InMemoryAuthorDirectory,
  InMemoryDependencyUsageDirectory,
  InMemoryHomebrewPackRepository,
  InMemoryPackDependencyRepository,
  InMemoryPackDirectory,
  InMemoryPackEnablementDirectory,
  PackDependencyService,
} from '@pioneer/homebrew/application';
import { contentPackId, ContentText, PackId } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';
import * as z from 'zod';

import { homebrewRoutes } from '../homebrew-routes';

/** Shared by the homebrew route specs. */

export const amiri = UserId.parse(newId());
export const ezren = UserId.parse(newId());

const PLAYER_CORE = PackId.parse('player-core');
export const playerCore = contentPackId(PLAYER_CORE);

/** The routes over in-memory adapters, with Player Core as the one official pack. */
export function app(
  enablement = new InMemoryPackEnablementDirectory(),
  usage = new InMemoryDependencyUsageDirectory(),
): AnyElysia {
  const packs = new InMemoryHomebrewPackRepository();
  const directory = new InMemoryPackDirectory(packs).official({
    id: playerCore,
    slug: PLAYER_CORE,
    title: ContentText.parse('Player Core'),
    publisher: ContentText.parse('Paizo'),
  });
  const dependencies = new InMemoryPackDependencyRepository();
  const service = new HomebrewPackService(
    {
      packs,
      authors: new InMemoryAuthorDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren'),
      enablement,
      directory,
      dependencies,
    },
    fixedClock('2026-10-10T10:00:00Z'),
  );
  const dependencyService = new PackDependencyService({ packs, directory, dependencies, usage, enablement });
  return new Elysia()
    .use(problemHandler)
    .use(homebrewRoutes({ packs: service, dependencies: dependencyService }, new FakeAuthenticator()));
}

/** No signed-in user. */
export const anonymous = Symbol('anonymous');

interface RequestOptions {
  /** The acting user; `anonymous` sends none. */
  readonly as?: UserId | typeof anonymous;
  readonly body?: unknown;
}

export function request(method: string, path: string, { as = amiri, body }: RequestOptions = {}): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(as === anonymous ? {} : actingAs(as)) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** The fields of a pack the route specs read. */
const PackJsonSchema = z.object({
  id: z.string(),
  slug: z.string(),
  ownerId: z.string(),
  visibility: z.string(),
  entryCount: z.number(),
});
export type PackJson = z.infer<typeof PackJsonSchema>;

export const feats = { title: 'Amiri feats', slug: 'amiri-feats' };
export const shareWithAll = { visibility: 'public' };
export const coreDependency = { dependsOn: playerCore };

/** A new pack made by `as`, the way `feats` is by default. */
export async function makePack(api: AnyElysia, as: UserId = amiri, body: object = feats): Promise<PackJson> {
  const response = await api.handle(request('POST', '/homebrew/packs', { as, body }));
  return PackJsonSchema.parse(await response.json());
}

export const dependenciesPath = (pack: PackJson): string => `/homebrew/packs/${pack.id}/dependencies`;
export const visibilityPath = (pack: PackJson): string => `/homebrew/packs/${pack.id}/visibility`;
