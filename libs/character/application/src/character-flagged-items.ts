import { inventoryViolations, itemContent, runeContent, violationCount } from '@pioneer/character/domain';
import type { Character, CharacterId, InventoryItemId, RuleBreak, RuleCount } from '@pioneer/character/domain';
import type { ContentId } from '@pioneer/rules/sdk';

import { contentOfCharacter, ruleLimitsOfCharacter } from './character-content';
import type { CharacterContentSource } from './character-content';

/** One rule an item of a character breaks, with the names the campaign's GM reads it by. */
export interface FlaggedLine {
  readonly character: CharacterId;
  readonly characterName: string;
  readonly item: InventoryItemId;
  readonly itemName: string;
  readonly rule: RuleBreak;
  /** How far the rule is broken: the count the item took the total to, or 1 for a rune not allowed. */
  readonly count: RuleCount;
  /** The rune a rune-not-allowed violation is about. */
  readonly rune: ContentId | undefined;
  readonly runeName: string | undefined;
}

/**
 * The rules a character's inventory breaks, worked out on every read against the limits it is held to and the content
 * it uses (ADR-0064). Nothing derived is stored. Framework-free.
 */
export class CharacterFlaggedItems {
  readonly #content: CharacterContentSource;

  public constructor(content: CharacterContentSource) {
    this.#content = content;
  }

  /** Every rule the character's items break, one entry per item and rule, in inventory order. */
  public async of(character: Character): Promise<readonly FlaggedLine[]> {
    const registry = await contentOfCharacter(this.#content, character).registry();
    const limits = await ruleLimitsOfCharacter(this.#content, character);
    const items = itemContent(registry);
    const runes = runeContent(registry);
    const { inventory } = character.document;
    return inventoryViolations(inventory, { items, runes }, limits).flatMap((violation): FlaggedLine[] => {
      const line = inventory.items.find((each) => each.id === violation.item);
      if (line === undefined) {
        return [];
      }
      const rune = violation.rule === 'runeNotAllowed' ? violation.rune : undefined;
      return [
        {
          character: character.id,
          characterName: character.name,
          item: line.id,
          itemName: line.name ?? items.get(line.item)?.name ?? line.item,
          rule: violation.rule,
          count: violationCount(violation),
          rune,
          runeName: rune === undefined ? undefined : (runes.get(rune)?.name ?? rune),
        },
      ];
    });
  }
}
