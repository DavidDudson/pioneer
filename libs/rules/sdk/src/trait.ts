import type { z } from 'zod';

import { Slug } from './content-id';

/** A trait slug (`humanoid`, `undead`). Content defines the set, so it is a brand, not a const object. */
export const Trait = Slug.brand<'Trait'>();
export type Trait = z.infer<typeof Trait>;

/** What a creature is immune to: a damage type, condition or effect (`poison`, `paralyzed`, `death-effects`). */
export const Immunity = Slug.brand<'Immunity'>();
export type Immunity = z.infer<typeof Immunity>;
