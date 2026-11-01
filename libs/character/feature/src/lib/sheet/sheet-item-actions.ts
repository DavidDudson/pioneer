import {
  activationUseKey,
  CarryState,
  heldCount,
  isInvestable,
  itemActivations,
  itemContent,
  spellContent,
  spellCost,
  SpendCount,
} from '@pioneer/character/domain';
import type { ActionCostRange, Character, ResourcesSpent, TurnState } from '@pioneer/character/domain';
import { ActionOriginKind, ActionStatus } from '@pioneer/rules/engine';
import type { StatisticInputs } from '@pioneer/rules/engine';
import { ActionMode, STAFF_CANTRIP } from '@pioneer/rules/sdk';
import type { ActionCost, ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { ActionResourceKind, STAFF_SPELL_BLOCK_MESSAGES } from '@pioneer/rules/ui';
import type { ActionLine, ActionResource, UsePayment } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { turnFit } from './sheet-actions';
import { traitNames } from './sheet-build';
import { consumableLines } from './sheet-consumables';
import { sheetCounted } from './sheet-counted';
import { sheetStaves } from './sheet-staves';

/** Why an item the character carries cannot be used yet. */
const ItemReasonMessage = {
  Stowed: 'character.sheet.itemActions.stowed',
  NotInvested: 'character.sheet.itemActions.notInvested',
  NoUses: 'character.sheet.itemActions.noUses',
  NoCharges: 'character.sheet.itemActions.noCharges',
  NotPrepared: 'character.sheet.itemActions.notPrepared',
  Unresolved: 'character.sheet.consumables.unresolved',
} as const;

/** What the item actions are worked out against: the turn that pays their cost, the spent resources and the character's values. */
export interface SheetItemPlay {
  readonly resources: ResourcesSpent;
  readonly turn?: TurnState | undefined;
  readonly inputs: StatisticInputs;
}

/** One usable thing an item gives, before the turn decides whether it can be paid for. */
interface ItemAction {
  readonly id: ContentId;
  readonly name: string;
  readonly traits: readonly string[];
  readonly cost: ActionCost | undefined;
  readonly range: ActionCostRange | undefined;
  readonly resource: ActionResource;
  readonly payment: UsePayment;
  /** Why it cannot be used whatever the turn leaves. */
  readonly reasons: readonly MessageDescriptor[];
}

/** Items work in every mode: a potion is drunk in a fight and between adventures alike. */
const ALL_MODES: readonly ActionMode[] = [ActionMode.Encounter, ActionMode.Exploration, ActionMode.Downtime];

/** The action list's line for `item`, unusable when it has a reason of its own or the turn cannot pay for it. */
function lineOf(item: ItemAction, turn: TurnState | undefined): ActionLine {
  const fit = turnFit(turn, item.cost, item.range);
  const reasons = [...item.reasons, ...fit.reasons];
  return {
    id: item.id,
    name: item.name,
    traits: item.traits,
    cost: item.cost,
    modes: ALL_MODES,
    origin: { kind: ActionOriginKind.Item },
    source: undefined,
    status: reasons.length > 0 || fit.affordable === false ? ActionStatus.Unavailable : ActionStatus.Available,
    reasons,
    resource: item.resource,
    payment: item.payment,
    roll: undefined,
    priority: undefined,
    dormant: false,
    upTo: item.range?.upTo,
    affordable: fit.affordable,
    affordableUpTo: fit.affordableUpTo,
  };
}

/** The cost an activation or consumable has, with the most actions it can run to. */
function rangeOf(cost: ActionCost, upTo: number | undefined): ActionCostRange {
  return { cost, upTo: upTo === undefined ? undefined : SpendCount.parse(upTo) };
}

/** The consumables held, each with its stack as the resource it spends. */
function consumableActions(registry: ContentRegistry, character: Character, play: SheetItemPlay): ItemAction[] {
  const traits = traitNames(registry);
  const entries = itemContent(registry);
  return consumableLines(registry, character, { turn: play.turn, inputs: play.inputs }).map((line): ItemAction => ({
    id: line.id,
    name: line.name,
    traits: (entries.get(line.id)?.traits ?? []).map((trait) => traits.get(trait) ?? trait),
    cost: line.cost,
    range: rangeOf(line.cost, line.upTo),
    resource: { kind: ActionResourceKind.Quantity, current: line.quantity },
    payment: { consumable: line.key },
    reasons:
      line.unresolved === undefined ? [] : [message(ItemReasonMessage.Unresolved, { reference: line.unresolved })],
  }));
}

/** The activations with a frequency of the items the character carries, each with the uses it has left. */
function activationActions(registry: ContentRegistry, character: Character, play: SheetItemPlay): ItemAction[] {
  const entries = itemContent(registry);
  const activations = itemActivations(registry);
  const counted = sheetCounted(registry, character);
  return character.document.inventory.items.flatMap((held): ItemAction[] => {
    const entry = entries.get(held.item);
    if (entry === undefined || held.carry.state === CarryState.Dropped) {
      return [];
    }
    const own: MessageDescriptor[] = [];
    if (held.carry.state === CarryState.Stowed) {
      own.push(message(ItemReasonMessage.Stowed));
    }
    if (isInvestable(held, entry) && held.invested !== true) {
      own.push(message(ItemReasonMessage.NotInvested));
    }
    return (activations.get(held.item) ?? []).flatMap(({ slug, name, cost, upTo }): ItemAction[] => {
      const key = activationUseKey(held.id, slug);
      const maximum = counted.uses.get(key);
      if (maximum === undefined) {
        return [];
      }
      const current = heldCount({ spent: play.resources.uses, maxima: counted.uses, key });
      const itemName: string = held.name ?? entry.name;
      const activationName: string = name;
      return [
        {
          id: entry.id,
          name: itemName === activationName ? itemName : `${itemName}: ${activationName}`,
          traits: [],
          cost,
          range: cost === undefined ? undefined : rangeOf(cost, upTo),
          resource: { kind: ActionResourceKind.Uses, current, max: maximum.max },
          payment: { use: key },
          reasons: current === 0 ? [...own, message(ItemReasonMessage.NoUses)] : own,
        },
      ];
    });
  });
}

/** The spells of the staves the character holds, each cast with the staff's charges. */
function staffActions(registry: ContentRegistry, character: Character, play: SheetItemPlay): ItemAction[] {
  const spells = spellContent(registry);
  return sheetStaves(registry, character, { resources: play.resources }).flatMap((staff) =>
    staff.spells.map((spell): ItemAction => {
      const option = spell.options.find((each) => each.slot === undefined);
      const found = spells.anySpell(spell.id);
      const range = found === undefined ? undefined : spellCost(found);
      const reasons: MessageDescriptor[] = [];
      if (staff.charges === undefined) {
        reasons.push(message(ItemReasonMessage.NotPrepared));
      } else if (spell.blocked !== undefined) {
        reasons.push(
          message(STAFF_SPELL_BLOCK_MESSAGES[spell.blocked], { rank: spell.rank === STAFF_CANTRIP ? 0 : spell.rank }),
        );
      } else if (option === undefined) {
        reasons.push(message(ItemReasonMessage.NoCharges));
      }
      return {
        id: spell.id,
        name: `${spell.name} (${staff.name})`,
        traits: [],
        cost: range?.cost,
        range,
        resource: { kind: ActionResourceKind.Charges, current: staff.charges?.left ?? 0, max: staff.charges?.max },
        payment: { staff: { item: staff.key, spell: spell.id } },
        reasons,
      };
    }),
  );
}

/**
 * The actions the character's items give (#1776): a consumable, an activation with a frequency and a staff's spell, each
 * with the resource using it spends. An item that is dropped is not listed; one that is stowed, or not invested when it
 * must be, is listed unusable with the reason.
 */
export function sheetItemActions(
  registry: ContentRegistry,
  character: Character,
  play: SheetItemPlay,
): readonly ActionLine[] {
  return [
    ...consumableActions(registry, character, play),
    ...activationActions(registry, character, play),
    ...staffActions(registry, character, play),
  ].map((item) => lineOf(item, play.turn));
}
