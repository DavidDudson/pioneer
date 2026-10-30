import { Attribute, RollOption } from '@pioneer/rules/sdk';
import type { Level } from '@pioneer/rules/sdk';

import { attributeModifiers, boostSets } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import type { SlotContent } from './slot-reads';

const ATTRIBUTES: readonly Attribute[] = Object.values(Attribute);

/**
 * `attribute:<attribute>:mod:<n>` for each modifier at `level`, as Foundry writes them. A negative one can't be written
 * as a roll option, and no prerequisite asks for one, so it sets none: a minimum then reads as not met.
 */
function attributeOptions(document: CharacterDocument, content: SlotContent, level: Level): RollOption[] {
  const modifiers = attributeModifiers({ ...document, level }, content.boosts);
  return ATTRIBUTES.flatMap((attribute) => {
    const modifier = modifiers.get(attribute);
    return modifier < 0 ? [] : [RollOption.parse(`attribute:${attribute}:mod:${modifier}`)];
  });
}

/**
 * `attributeOptions` at each level, each read once for the boost sets in play there: the modifiers change only at the
 * levels a set of boosts comes in.
 */
export function attributeOptionsAt(document: CharacterDocument, content: SlotContent): (level: Level) => RollOption[] {
  const setLevels = boostSets(document, content.boosts).map((set) => set.level);
  const bySetCount = new Map<number, RollOption[]>();
  return (level) => {
    const setCount = setLevels.filter((each) => each <= level).length;
    const known = bySetCount.get(setCount) ?? attributeOptions(document, content, level);
    bySetCount.set(setCount, known);
    return known;
  };
}
