import { Endpoint, HttpMethod, NoBody, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterId } from './character-fields';
import {
  AddCompanionBody,
  ArchiveCompanionBody,
  CharacterCompanions,
  CompanionId,
  RestoreCompanionBody,
} from './companion';

const ById = z.object({ id: CharacterId });
const ByCompanion = z.object({ id: CharacterId, companionId: CompanionId });

/**
 * The endpoints for the companions a character owns (ADR-0079); `CharacterContract` includes them. Every one is owner
 * only: anyone else gets a 404. A write shares the character's transaction and bumps its version, so a stale
 * `expectedVersion` is a 409.
 */
export const CharacterCompanionContract = {
  /** The character's live companions, and its archived ones newest first. */
  companions: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id/companions',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: CharacterCompanions,
  }),
  /** Adds a companion. The character already holds a live one of that kind: 409. */
  addCompanion: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters/:id/companions',
    params: ById,
    query: NoQuery,
    body: AddCompanionBody,
    response: CharacterCompanions,
  }),
  /** Archives a live companion as replaced or released. One already archived is no change. */
  archiveCompanion: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters/:id/companions/:companionId/archive',
    params: ByCompanion,
    query: NoQuery,
    body: ArchiveCompanionBody,
    response: CharacterCompanions,
  }),
  /** Brings an archived companion back. Another live companion of its kind holds the place: 409. */
  restoreCompanion: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters/:id/companions/:companionId/restore',
    params: ByCompanion,
    query: NoQuery,
    body: RestoreCompanionBody,
    response: CharacterCompanions,
  }),
} as const;
