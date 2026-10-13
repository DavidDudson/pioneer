import { Pg } from '@pioneer/shared/kernel';
import type * as z from 'zod';

/** A count of points of one resource: held, spent, or its maximum. */
export const ResourceCount = Pg.smallint().min(0).brand<'ResourceCount'>();
export type ResourceCount = z.infer<typeof ResourceCount>;
