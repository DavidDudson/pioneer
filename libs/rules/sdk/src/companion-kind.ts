import type { ValueOf } from '@pioneer/shared/kernel';

/**
 * The kinds of creature that follow a character as a companion (ADR-0079). Only the familiar exists so far; the animal
 * companion and the eidolon join it later. It lives in the SDK so a rule, a prerequisite or a spell target can name a
 * kind without importing the character context.
 */
export const CompanionKind = {
  Familiar: 'familiar',
} as const;
export type CompanionKind = ValueOf<typeof CompanionKind>;
