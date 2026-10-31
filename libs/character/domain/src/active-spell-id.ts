import { Uuid } from '@pioneer/shared/kernel';
import type * as z from 'zod';

/** One active spell on a character, apart from its content: a cast may be sustained or dismissed on its own. */
export const ActiveSpellId = Uuid.brand<'ActiveSpellId'>();
export type ActiveSpellId = z.infer<typeof ActiveSpellId>;
