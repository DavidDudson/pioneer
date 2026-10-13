import { ContentText, PackId } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** What the new-pack form submits; the same schema the server validates with. */
export const CreatePackForm = z.object({ title: ContentText, slug: PackId });
