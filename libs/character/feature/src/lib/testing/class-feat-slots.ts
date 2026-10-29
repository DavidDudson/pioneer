import { playerCoreClassId } from '@pioneer/character/domain/testing';
import type { PlayerCoreClass } from '@pioneer/character/domain/testing';
import { officialPacks } from '@pioneer/rules/catalog';
import type { ContentId } from '@pioneer/rules/sdk';

function isChoiceSet(rule: unknown, flag: string): boolean {
  return (
    typeof rule === 'object' &&
    rule !== null &&
    'key' in rule &&
    rule.key === 'ChoiceSet' &&
    'flag' in rule &&
    rule.flag === flag
  );
}

/**
 * The slot key of the `ChoiceSet` flagged `flag` on the committed entry `id`, so a re-import that shifts an entry's
 * rule indices does not break the specs that name a slot.
 */
export async function choiceSlotKey(id: ContentId, flag: string): Promise<string> {
  const contents = await Promise.all(officialPacks.map(async (pack) => pack.load()));
  const rules = contents.flatMap(({ entries }) => entries).find((entry) => entry.id === id)?.rules ?? [];
  const index = rules.findIndex((rule) => isChoiceSet(rule, flag));
  if (index === -1) {
    throw new Error(`${id} has no ChoiceSet flagged ${flag}`);
  }
  return `${id}:${index}`;
}

/** The slot key of the Player Core `className` class feat slot at `level`. */
export async function classFeatSlotKey(className: PlayerCoreClass, level: number): Promise<string> {
  return choiceSlotKey(playerCoreClassId(className), `class-feat-${level}`);
}
