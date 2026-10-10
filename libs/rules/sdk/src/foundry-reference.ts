import type { ReferencePath } from '@pioneer/rules/formula';
import * as z from 'zod';

import { fill, knownReference, match, ReferencePattern } from './formula-reference';

/*
 * The Foundry spellings the importer translates to Pioneer's reference paths (ADR-0016), and the translation.
 * `docs/architecture/rules-engine.md` ("Formula references") documents the same table.
 */

/** A Foundry pf2e reference path in the same notation (`actor.abilities.<attribute>.mod`). */
export const FoundryReferencePattern = z.string().brand<'FoundryReferencePattern'>();
export type FoundryReferencePattern = z.infer<typeof FoundryReferencePattern>;

/** One Foundry spelling and the Pioneer path it translates to; placeholders carry across by name. */
export interface FoundryReference {
  readonly foundry: FoundryReferencePattern;
  readonly pioneer: ReferencePattern;
}

/** Foundry spelling, then Pioneer path. */
const FOUNDRY_SPELLINGS = [
  ['actor.level', 'level'],
  ['actor.system.details.level.value', 'level'],
  ['actor.abilities.<attribute>.mod', 'attr.<attribute>'],
  ['actor.system.abilities.<attribute>.mod', 'attr.<attribute>'],
  ['actor.system.attributes.ancestryhp', 'ancestry.hp'],
  ['actor.ancestry.system.hp', 'ancestry.hp'],
  ['actor.ancestry.system.speed', 'ancestry.speed'],
  ['actor.system.attributes.classhp', 'class.hp'],
  ['actor.class.system.hp', 'class.hp'],
  ['actor.skills.<skill>.rank', 'rank.skill.<skill>'],
  ['actor.system.skills.<skill>.rank', 'rank.skill.<skill>'],
  ['actor.saves.<save>.rank', 'rank.save.<save>'],
  ['actor.system.saves.<save>.rank', 'rank.save.<save>'],
  ['actor.perception.rank', 'rank.perception'],
  ['actor.system.perception.rank', 'rank.perception'],
  ['actor.system.proficiencies.attacks.<category>.rank', 'rank.attack.<category>'],
  ['actor.system.proficiencies.defenses.<category>.rank', 'rank.defense.<category>'],
  ['actor.system.proficiencies.traditions.<tradition>.rank', 'rank.spellcasting.<tradition>'],
  ['item.level', 'item.level'],
  ['item.system.level.value', 'item.level'],
] as const;

/**
 * The Foundry paths the importer translates (ADR-0016). Foundry spells most values two ways, through the actor's
 * getters and through its `system` data; the exporter writes the first spelling listed for a path. Any other
 * Foundry path is reported as untranslatable.
 */
export const FOUNDRY_REFERENCES: readonly FoundryReference[] = FOUNDRY_SPELLINGS.map(([foundry, pioneer]) => ({
  foundry: FoundryReferencePattern.parse(foundry),
  pioneer: ReferencePattern.parse(pioneer),
}));

/**
 * The Pioneer path a Foundry reference path translates to, or undefined when the table has no translation that
 * lands on a known reference. The importer's translation, and the hint when Foundry's spelling is written by hand.
 */
export function fromFoundryPath(path: ReferencePath): ReferencePath | undefined {
  for (const { foundry, pioneer } of FOUNDRY_REFERENCES) {
    const captures = match(foundry, path);
    const translated = captures === undefined ? undefined : fill(pioneer, captures);
    if (translated !== undefined && knownReference(translated) !== undefined) {
      return translated;
    }
  }
  return undefined;
}
