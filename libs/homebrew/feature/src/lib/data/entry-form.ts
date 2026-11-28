import { ContentKindSchema, ContentText, RaritySchema } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** What the new-entry form submits: the kind, a name and a rarity. Level and traits start empty. */
export const CreateEntryForm = z.object({ kind: ContentKindSchema, name: ContentText, rarity: RaritySchema });

/** What the edit form submits. */
export const EditEntryForm = z.object({ name: ContentText, rarity: RaritySchema });
