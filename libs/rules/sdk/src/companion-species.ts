import * as z from 'zod';

import { CompanionStatBlock } from './companion-stat-block';

/**
 * A companion species's `data` on the `ContentEntry` envelope: the stat block an animal companion of it starts from
 * (Player Core p. 206). A bear, a wolf and a horse are entries of this kind; a pack can add its own (ADR-0080).
 */
export const CompanionSpeciesData = z.strictObject({ block: CompanionStatBlock });

export type CompanionSpeciesData = z.infer<typeof CompanionSpeciesData>;
