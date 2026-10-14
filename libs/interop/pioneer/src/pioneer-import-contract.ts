import { Character, CharacterLevel, CharacterName } from '@pioneer/character/domain';
import { Endpoint, HttpMethod, NoParams, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { HomebrewPackReport } from './homebrew-import-plan';
import { UnmatchedContentGroup } from './unmatched-content';

/**
 * What importing a file would make: the character's name and level, what happens to each embedded homebrew entry, and
 * the content neither a loaded pack nor the file has.
 */
export const PioneerImportPreview = z.object({
  name: CharacterName,
  level: CharacterLevel,
  homebrew: z.array(HomebrewPackReport).readonly(),
  unmatched: z.array(UnmatchedContentGroup).readonly(),
});
export type PioneerImportPreview = z.infer<typeof PioneerImportPreview>;

/**
 * The Pioneer character file import API. Both bodies are the file itself, `z.unknown()` on purpose: the service is the
 * trust boundary, so a file it can't read is its own problem (a newer format, a newer character) rather than a generic
 * schema 422. Preview saves nothing; import reads the file again and never trusts a client's preview.
 */
export const PioneerImportContract = {
  preview: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters/import/pioneer/preview',
    params: NoParams,
    query: NoQuery,
    body: z.unknown(),
    response: PioneerImportPreview,
  }),
  import: new Endpoint({
    method: HttpMethod.Post,
    path: '/characters/import/pioneer',
    params: NoParams,
    query: NoQuery,
    body: z.unknown(),
    response: Character.codec,
  }),
} as const;
