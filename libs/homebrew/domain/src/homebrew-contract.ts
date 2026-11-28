import { ContentId, ContentPackId, ContentText, PackId, PackVisibility } from '@pioneer/rules/sdk';
import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CreateHomebrewEntryBody, HomebrewEntrySummary, UpdateHomebrewEntryBody } from './homebrew-entry';
import { HomebrewPack } from './homebrew-pack';
import { PackDependencies } from './pack-summary';

const ById = z.object({ id: ContentPackId });
const ByEntry = z.object({ id: ContentPackId, entryId: ContentId });
const ByDependency = z.object({ id: ContentPackId, dependsOn: ContentPackId });

export const CreateHomebrewPackBody = z.object({
  title: ContentText,
  slug: PackId,
});

export type CreateHomebrewPackBody = z.infer<typeof CreateHomebrewPackBody>;

export const SetPackVisibilityBody = z.object({
  visibility: z.enum(PackVisibility),
});

export type SetPackVisibilityBody = z.infer<typeof SetPackVisibilityBody>;

/** `?archived=true` lists the archived entries instead of the live ones. */
const EntryListQuery = z.object({ archived: z.stringbool().optional() });

/** Which pack to extend. */
export const AddPackDependencyBody = z.object({ dependsOn: ContentPackId });

export type AddPackDependencyBody = z.infer<typeof AddPackDependencyBody>;

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
  /** The actor's archived packs (ADR-0062), newest first. */
  archived: new Endpoint({
    method: HttpMethod.Get,
    path: '/homebrew/packs/archived',
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
  /**
   * Owner only (403 for another reader, 404 for anyone who cannot read the pack): archives the pack, which then is
   * not offered, read or in force for anyone, and can be restored. Packs that still extend it are a 409. Archiving it
   * twice is harmless.
   */
  archive: new Endpoint({
    method: HttpMethod.Post,
    path: '/homebrew/packs/:id/archive',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: HomebrewPack.codec,
  }),
  /**
   * Owner only: brings an archived pack back as it was. One that extends an archived pack is a 409. Restoring a live
   * one is harmless.
   */
  restore: new Endpoint({
    method: HttpMethod.Post,
    path: '/homebrew/packs/:id/restore',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: HomebrewPack.codec,
  }),
  /** The packs this one extends, and the ones its owner could add. Readable by anyone who can read the pack. */
  dependencies: new Endpoint({
    method: HttpMethod.Get,
    path: '/homebrew/packs/:id/dependencies',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: PackDependencies,
  }),
  /**
   * Owner only (403 for another reader, 404 for anyone who cannot read the pack). The dependency must be readable by
   * the actor too, else 404. A pack cannot depend on itself, close a cycle, or be wider than what it depends on: each
   * is a 409. Adding it twice is harmless.
   */
  addDependency: new Endpoint({
    method: HttpMethod.Post,
    path: '/homebrew/packs/:id/dependencies',
    params: ById,
    query: NoQuery,
    body: AddPackDependencyBody,
    response: PackDependencies,
  }),
  /** Owner only. Entries that still reference the dependency refuse it with a 409 naming them. Removing it twice is harmless. */
  removeDependency: new Endpoint({
    method: HttpMethod.Delete,
    path: '/homebrew/packs/:id/dependencies/:dependsOn',
    params: ByDependency,
    query: NoQuery,
    body: NoBody,
    response: PackDependencies,
  }),
  /** The pack's entries, live or archived (`?archived=true`), by kind then name. Owner only; anyone else gets a 404. */
  entries: new Endpoint({
    method: HttpMethod.Get,
    path: '/homebrew/packs/:id/entries',
    params: ById,
    query: EntryListQuery,
    body: NoBody,
    response: z.array(HomebrewEntrySummary),
  }),
  /**
   * A new entry of the chosen kind, starting from that kind's starter data. Owner only; anyone else gets a 404. A
   * slug already used by that kind in the pack is a 409; a kind that cannot start without another entry, or fields
   * the kind's schema refuses, are a 422 with message keys.
   */
  createEntry: new Endpoint({
    method: HttpMethod.Post,
    path: '/homebrew/packs/:id/entries',
    params: ById,
    query: NoQuery,
    body: CreateHomebrewEntryBody,
    response: HomebrewEntrySummary,
  }),
  /** Owner only. Changes the name, level, rarity and traits; the kind, slug and id stay. An archived entry is a 404. */
  updateEntry: new Endpoint({
    method: HttpMethod.Patch,
    path: '/homebrew/packs/:id/entries/:entryId',
    params: ByEntry,
    query: NoQuery,
    body: UpdateHomebrewEntryBody,
    response: HomebrewEntrySummary,
  }),
  /** Owner only: archives the entry (ADR-0062), which then is in force nowhere. Archiving it twice is harmless. */
  archiveEntry: new Endpoint({
    method: HttpMethod.Post,
    path: '/homebrew/packs/:id/entries/:entryId/archive',
    params: ByEntry,
    query: NoQuery,
    body: NoBody,
    response: HomebrewEntrySummary,
  }),
  /** Owner only: brings an archived entry back as it was. Restoring a live one is harmless. */
  restoreEntry: new Endpoint({
    method: HttpMethod.Post,
    path: '/homebrew/packs/:id/entries/:entryId/restore',
    params: ByEntry,
    query: NoQuery,
    body: NoBody,
    response: HomebrewEntrySummary,
  }),
} as const;
