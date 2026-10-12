import { ContentKind, Proficiency, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { resolveSlug } from './entry-references';
import { addRule, KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';

/**
 * Foundry's proficiency ranks as `Proficiency` elements: a class's starting ranks, and the ranks a feat or class
 * feature raises through `subfeatures.proficiencies` (content-model.md, "Build kind data").
 */

const FIELD = 'subfeatures.proficiencies';
const RANK_MAX = 4;
const KEYS_MAX = 16;
const FIELD_MAX = 64;

/** Foundry's rank numbers, 0 (untrained) to 4 (legendary). */
export const FoundryRank = z.number().int().min(0).max(RANK_MAX);

/** The rank Foundry's number names; untrained is every statistic's floor, so it raises nothing. */
export const RANKS: readonly (Proficiency | undefined)[] = [
  undefined,
  Proficiency.Trained,
  Proficiency.Expert,
  Proficiency.Master,
  Proficiency.Legendary,
];

/** The character's class DC; Foundry keys a class's own by the class's slug. */
export const CLASS_DC = 'class-dc';

/** The selector each of Foundry's statistic keys names; a class's slug, its class DC, is resolved apart. */
const SELECTORS: ReadonlyMap<string, string> = new Map([
  ['perception', 'perception'],
  ['fortitude', 'save:fortitude'],
  ['reflex', 'save:reflex'],
  ['will', 'save:will'],
  ['unarmed', 'attack:unarmed'],
  ['simple', 'attack:simple'],
  ['martial', 'attack:martial'],
  ['advanced', 'attack:advanced'],
  ['unarmored', 'defense:unarmored'],
  ['light', 'defense:light'],
  ['medium', 'defense:medium'],
  ['heavy', 'defense:heavy'],
  // One rank for all of the character's spellcasting, as Foundry keeps it (ADR-0040).
  ['spellcasting', 'spellcasting'],
]);

/**
 * One raised statistic: its rank, and for a class DC the attribute it uses instead of the key attribute (a
 * dedication's), which Pioneer's one class DC has no place for.
 */
const FoundryRaise = z.looseObject({ rank: FoundryRank, attribute: z.string().max(FIELD_MAX).nullish() });
type FoundryRaise = z.infer<typeof FoundryRaise>;

const FoundrySubfeatureProficiencies = z.record(z.string().max(FIELD_MAX), FoundryRaise);

/** The selector a key names: a statistic, or a class's slug for its class DC; undefined when it names neither. */
function selectorOf(key: string, { references }: KindInput): string | undefined {
  const statistic = SELECTORS.get(key);
  if (statistic !== undefined) {
    return statistic;
  }
  return resolveSlug(references, ContentKind.Class, key) === undefined ? undefined : CLASS_DC;
}

/**
 * `subfeatures.proficiencies` as a `Proficiency` element per raised statistic. A key naming no statistic or class,
 * and a class DC's own attribute, are reported.
 */
export function proficiencyRules(raw: unknown, input: KindInput): void {
  if (raw === undefined) {
    return;
  }
  const parsed = FoundrySubfeatureProficiencies.safeParse(raw);
  if (!parsed.success || Object.keys(parsed.data).length > KEYS_MAX) {
    report(input.log, { reason: KindDataGapReason.InvalidData, field: FIELD, raw });
    return;
  }
  for (const [key, raise] of Object.entries(parsed.data)) {
    raiseRule(key, raise, input);
  }
}

/** The `Proficiency` element raising the statistic `key` names; reported when it names none. */
function raiseRule(key: string, raise: FoundryRaise, input: KindInput): void {
  const field = `${FIELD}.${key}`;
  const selector = selectorOf(key, input);
  const rank = RANKS[raise.rank];
  if (selector === undefined) {
    report(input.log, { reason: KindDataGapReason.UnmappedValue, field, raw: raise });
  } else if (rank !== undefined) {
    addRule(input, field, { key: RuleElementKey.Proficiency, selector, rank });
  }
  if (selector === CLASS_DC && typeof raise.attribute === 'string') {
    report(input.log, { reason: KindDataGapReason.UnmappedField, field: `${field}.attribute`, raw: raise.attribute });
  }
}
