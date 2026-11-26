import type { ValueOf } from '@pioneer/shared/kernel';

/**
 * The kinds of creature that follow a character as a companion (ADR-0079). The familiar and the animal companion exist so far
 * (ADR-0080); the eidolon joins them later. It lives in the SDK so a rule, a prerequisite or a spell target can name a
 * kind without importing the character context.
 */
export const CompanionKind = {
  Familiar: 'familiar',
  AnimalCompanion: 'animal-companion',
} as const;

export type CompanionKind = ValueOf<typeof CompanionKind>;
