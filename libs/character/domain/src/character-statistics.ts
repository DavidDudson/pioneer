import { deriveStatistics, statisticContent } from '@pioneer/rules/engine';
import type { StatisticInputs, StatisticResult } from '@pioneer/rules/engine';
import { AncestryId, HitPoints, Selector } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import { attributeModifiers, boostContent } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { ANCESTRY_SLOT } from './character-slots';
import { buildRanks, characterGrants, classContent, classInputs } from './class-build';
import { equippedInputs, equippedRules } from './equipped';
import { favoredWeapons } from './favored-weapons';
import { grantedStrikes } from './granted-strikes';
import { itemContent } from './inventory-content';
import type { SlotContent } from './slot-offer';
import { characterSpellcasting } from './spellcasting-build';

/** The statistic the engine derives a character's maximum Hit Points as. */
export const MAX_HP_SELECTOR = Selector.parse('hp:max');

/** What the ancestry gives: `@ancestry.hp` and `@ancestry.speed`. Nothing while it is unpicked or not loaded. */
function ancestryInputs(registry: ContentRegistry, document: CharacterDocument): Pick<StatisticInputs, 'ancestry'> {
  const picked = AncestryId.safeParse(document.build.choices[ANCESTRY_SLOT]);
  const ancestry = picked.success ? registry.ancestry(picked.data) : undefined;
  if (ancestry === undefined) {
    return {};
  }
  const { hitPoints, speed } = ancestry.definition;
  return { ancestry: { hitPoints, speed } };
}

/** What the class gives: `@class.hp` and the key attribute. Nothing until the class and its key attribute are known. */
function classInputsOf(
  registry: ContentRegistry,
  document: CharacterDocument,
  slots: SlotContent,
): Pick<StatisticInputs, 'class'> {
  const inputs = classInputs(document, slots, classContent(registry));
  return inputs === undefined ? {} : { class: inputs };
}

/**
 * What the engine reads of a character so far: level, the modifiers its boosts give, the ranks its class, background,
 * features and skill picks raise, what its ancestry and class give, the spellcasting entries its spell attacks and DCs
 * are derived for, its worn armour and held weapons when the registry holds the item kinds, and the Strikes its features
 * give (a fist).
 */
export function characterStatisticInputs(
  registry: ContentRegistry,
  document: CharacterDocument,
  slots: SlotContent,
): StatisticInputs {
  const grants = characterGrants(document, slots);
  const favored = favoredWeapons(grants);
  const equipped = equippedInputs(document.inventory, itemContent(registry), favored);
  const held = new Set(equipped.weapons.map(({ slug }) => slug));
  const granted = grantedStrikes(grants, favored).filter(({ slug }) => !held.has(slug));
  return {
    level: document.level,
    attributes: attributeModifiers(document, boostContent(registry)),
    ranks: buildRanks(document, slots),
    spellcasting: characterSpellcasting(grants),
    ...ancestryInputs(registry, document),
    ...classInputsOf(registry, document, slots),
    ...equipped,
    weapons: [...equipped.weapons, ...granted],
  };
}

/** What a character's statistics are derived from: the registry, the slot content read from it, and its inputs. */
export interface StatisticSources {
  readonly registry: ContentRegistry;
  readonly slots: SlotContent;
  readonly inputs: StatisticInputs;
}

/**
 * Every statistic the engine derives for a character, with the rule elements of the items it wears, holds or has
 * invested in play when the registry holds the item kinds. Empty without a proficiency bonus table, as nothing can be
 * derived.
 */
export function characterStatistics(
  document: CharacterDocument,
  { registry, slots, inputs }: StatisticSources,
): ReadonlyMap<Selector, StatisticResult> {
  const content = statisticContent(registry);
  if (content === undefined) {
    return new Map();
  }
  return deriveStatistics(content, inputs, equippedRules(document, itemContent(registry), slots));
}

/**
 * The character's maximum Hit Points as the engine derives `hp:max`; undefined while it can't be (no ancestry or class
 * yet, or no statistic for it loaded). A negative total, as a low Constitution at level 1 could give in theory, is 0.
 */
export function maxHitPoints(statistics: ReadonlyMap<Selector, StatisticResult>): HitPoints | undefined {
  const result = statistics.get(MAX_HP_SELECTOR);
  if (result === undefined || !result.ok) {
    return undefined;
  }
  return HitPoints.parse(Math.max(0, result.total));
}
