import { CarryState, ConsumableCommandField, EffectInstanceId, itemContent, SpendId } from '@pioneer/character/domain';
import type { Character, ConsumableCommand, InventoryItemId, TurnState } from '@pioneer/character/domain';
import { DiceExpressionText, parseDiceExpression, rollDice } from '@pioneer/rules/dice';
import type { DiceExpression, RandomSource, RollResult } from '@pioneer/rules/dice';
import { ActionCost, ConsumableCategory, ContentKind, DamageKind, HitPoints } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

import { affordability, spendCostOf } from './sheet-actions';

/** What using a consumable costs when its content gives none: one action, an Interact to drink, throw or apply it. */
const DEFAULT_COST = ActionCost.One;

/** The message each activation cost is shown as. */
export const CONSUMABLE_COST_MESSAGES = {
  [ActionCost.One]: 'character.sheet.consumables.costOne',
  [ActionCost.Two]: 'character.sheet.consumables.costTwo',
  [ActionCost.Three]: 'character.sheet.consumables.costThree',
  [ActionCost.Free]: 'character.sheet.consumables.costFree',
  [ActionCost.Reaction]: 'character.sheet.consumables.costReaction',
} as const satisfies Record<ActionCost, string>;

/** The consumables that are used from another list: ammunition is fired, a wand is cast, a scroll casts its spell. */
const ELSEWHERE: ReadonlySet<ConsumableCategory> = new Set([ConsumableCategory.Ammunition, ConsumableCategory.Wand]);

/** A consumable the character holds, as the encounter tab lists it. */
export interface ConsumableLine {
  /** The inventory item that holds the stack. */
  readonly key: InventoryItemId;
  /** The content the item is; the spend names it. */
  readonly id: ContentId;
  readonly name: string;
  readonly quantity: number;
  /** The activation's cost; one action when the content gives none. */
  readonly cost: ActionCost;
  /** The most actions a variable cost can take. */
  readonly upTo: number | undefined;
  /** The roll using it makes, and what the roll is; undefined when it rolls nothing. */
  readonly roll: ConsumableRoll | undefined;
  /** The effect using it puts on the character. */
  readonly effect: ContentId | undefined;
  /** The name of that effect, when the content has it. */
  readonly effectName: string | undefined;
  /** Whether the turn can pay for the activation now. */
  readonly affordable: boolean;
}

/** The dice a consumable rolls when used. */
export interface ConsumableRoll {
  readonly expression: DiceExpression;
  readonly kind: DamageKind;
}

/** A consumable's content entry. */
type ConsumableEntry = Extract<ContentEntry, { readonly kind: 'consumable' }>;

function isListed(entry: ContentEntry | undefined): entry is ConsumableEntry {
  return (
    entry?.kind === ContentKind.Consumable && !ELSEWHERE.has(entry.data.category) && entry.data.spell === undefined
  );
}

/** The roll a formula makes, when it is plain dice; one that reads the character (`@attr.str`) is the table's to roll. */
function rollOf(formula: string, kind: DamageKind): ConsumableRoll | undefined {
  const parsed = parseDiceExpression(DiceExpressionText.parse(formula.replaceAll(/\s+/gu, '')));
  return parsed.ok ? { expression: parsed.expression, kind } : undefined;
}

/** The consumables the character holds, in inventory order, with what the turn leaves of each one's cost. */
export function consumableLines(
  registry: ContentRegistry,
  character: Character,
  turn: TurnState | undefined,
): readonly ConsumableLine[] {
  const items = itemContent(registry);
  const names = new Map(registry.packs.flatMap((pack) => pack.otherEntries).map((entry) => [entry.id, entry.name]));
  return character.document.inventory.items.flatMap((held): readonly ConsumableLine[] => {
    const entry = items.get(held.item);
    if (!isListed(entry) || held.carry.state === CarryState.Dropped) {
      return [];
    }
    const { activation, damage, effect } = entry.data;
    const cost = activation?.cost ?? DEFAULT_COST;
    return [
      {
        key: held.id,
        id: entry.id,
        name: entry.name,
        quantity: held.quantity,
        cost,
        upTo: activation?.upTo,
        roll: damage === undefined ? undefined : rollOf(damage.formula, damage.kind),
        effect,
        effectName: effect === undefined ? undefined : names.get(effect),
        affordable: affordability(turn, cost, activation?.upTo).affordable ?? true,
      },
    ];
  });
}

/** The roll as it fell, for the card; the total is what a healing roll restores. */
export function rollConsumable(roll: ConsumableRoll, random: RandomSource): RollResult {
  return rollDice(roll.expression, random);
}

/**
 * The edit that uses `line`: its activation spent, the stack down by one, the effect it gives applied and, for a
 * healing roll, the Hit Points the roll restored. The server checks the spend and the effect against the content.
 */
export function useCommand(line: ConsumableLine, rolled: RollResult | undefined): ConsumableCommand | undefined {
  const cost = spendCostOf(line.cost, undefined);
  if (cost === undefined) {
    return undefined;
  }
  const heals = rolled !== undefined && line.roll?.kind === DamageKind.Healing && rolled.total > 0;
  return {
    field: ConsumableCommandField.UseConsumable,
    item: line.key,
    spend: { id: SpendId.parse(newId()), action: line.id, cost },
    ...(heals ? { heal: HitPoints.parse(rolled.total) } : {}),
    ...(line.effect === undefined ? {} : { effect: { id: EffectInstanceId.parse(newId()), effect: line.effect } }),
  };
}
