import { CharacterNameSchema } from '@pioneer/character/domain';
import { AncestryId } from '@pioneer/rules/sdk';
import { z } from 'zod';

/** What the new-character form submits; the same schemas the server validates with. */
export const CreateCharacterForm = z.object({ name: CharacterNameSchema, ancestry: AncestryId });
