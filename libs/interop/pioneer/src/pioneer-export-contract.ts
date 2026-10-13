import { CharacterId } from '@pioneer/character/domain';
import { Endpoint, HttpMethod, NoBody, NoQuery } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { PioneerCharacterFile } from './pioneer-character-file';

/**
 * The Pioneer character file API. Lives here, not in `CharacterContract`, because this lib already depends on the
 * character domain. A character whose content is not all loaded is a 422 naming what is missing, not a lossy file.
 */
export const PioneerExportContract = {
  export: new Endpoint({
    method: HttpMethod.Get,
    path: '/characters/:id/export',
    params: z.object({ id: CharacterId }),
    query: NoQuery,
    body: NoBody,
    response: PioneerCharacterFile,
  }),
} as const;
