import { Proficiency, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { loreTopic } from './foundry-lore';
import { addRule, ENVELOPE_FIELDS } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { attributeSlots, FoundryAttributeSlots, FoundryGrantedItems, grantItems, systemOf } from './kind-fields';

/**
 * A background's `data` from Foundry's `background` item: its boosts. Its trained skills and Lore become
 * `Proficiency` elements and its skill feat a `GrantItem` (content-model.md, "Build data").
 */

export const BACKGROUND_FIELDS: ReadonlySet<string> = new Set([...ENVELOPE_FIELDS, 'boosts', 'items', 'trainedSkills']);

const FIELD_MAX = 64;
const NAME_MAX = 500;
const SKILLS_MAX = 32;

/** Foundry's trained skills: skill slugs, and Lore by name (`Scribing Lore`). */
export const FoundryTrainedSkills = z.looseObject({
  value: z.array(z.string().max(FIELD_MAX)).max(SKILLS_MAX).default([]),
  lore: z.array(z.string().max(NAME_MAX)).max(SKILLS_MAX).default([]),
});
export type FoundryTrainedSkills = z.infer<typeof FoundryTrainedSkills>;

const FoundryBackgroundSystem = z.looseObject({
  boosts: FoundryAttributeSlots.default({}),
  trainedSkills: FoundryTrainedSkills.default({ value: [], lore: [] }),
  items: FoundryGrantedItems.default({}),
});

/** The selector of each skill and Lore, in Foundry's order. */
function skillSelectors({ value, lore }: FoundryTrainedSkills): string[] {
  return [...value.map((skill) => `skill:${skill}`), ...lore.map((name) => `skill:lore:${loreTopic(name)}`)];
}

/** A `Proficiency` element raising each skill and Lore to trained. */
export function trainSkills(skills: FoundryTrainedSkills, input: KindInput): void {
  for (const selector of skillSelectors(skills)) {
    addRule(input, 'trainedSkills', { key: RuleElementKey.Proficiency, selector, rank: Proficiency.Trained });
  }
}

/** The background's data, unparsed; undefined when its `system` is not shaped as a background's. */
export function backgroundData(input: KindInput): object | undefined {
  const system = systemOf(FoundryBackgroundSystem, input);
  if (system === undefined) {
    return undefined;
  }
  trainSkills(system.trainedSkills, input);
  grantItems(system.items, 'items', input);
  return { boosts: attributeSlots(system.boosts, 'boosts', input.log) };
}
