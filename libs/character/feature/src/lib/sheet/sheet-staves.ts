import {
  characterGrants,
  characterSpellcasting,
  itemContent,
  slotCountKey,
  spellContent,
  spellCost,
  SpendKind,
  staffCantripRank,
  staffCastCost,
  staffCastOptions,
  staffSources,
  StaffSpellProblem,
} from '@pioneer/character/domain';
import type {
  Character,
  ResourcesSpent,
  SlotCountKey,
  SpendId,
  SpendRequest,
  StaffCast,
  StaffCommand,
  StaffSlots,
  StaffSource,
} from '@pioneer/character/domain';
import { ActionCost, STAFF_CANTRIP } from '@pioneer/rules/sdk';
import type { ContentRegistry, SpellRank } from '@pioneer/rules/sdk';
import { StaffSpellBlock } from '@pioneer/rules/ui';
import type { StaffCastOptionLine, StaffLine, StaffSpellLine } from '@pioneer/rules/ui';

import { spendCostOf } from './sheet-actions';
import { sheetCounted } from './sheet-counted';
import { sheetSlotContent } from './sheet-slot-content';

/** What stops a spell of a staff being cast, as the list words it. */
const BLOCKS: Readonly<Record<StaffSpellProblem, StaffSpellBlock>> = {
  [StaffSpellProblem.NotOnList]: StaffSpellBlock.NotOnList,
  [StaffSpellProblem.RankTooHigh]: StaffSpellBlock.RankTooHigh,
};

/**
 * The spend that casts `spell` from the staff `item`, paying the charge with `slot` when it is given: the spell's cost
 * in actions (its fewest, for a spell cast for a range of them), recording the staff cast so taking the spend back from
 * the spend log gives the charges and the slot back. A spell the content gives no cost in actions for, one cast over
 * minutes or with no casting time, takes nothing from the turn.
 */
export function staffSpendRequest(registry: ContentRegistry, cast: StaffCast, id: SpendId): SpendRequest {
  const option = spellContent(registry).anySpell(cast.spell);
  const range = option === undefined ? undefined : spellCost(option);
  const cost = spendCostOf(range?.cost ?? ActionCost.Free, undefined) ?? { kind: SpendKind.Free };
  return { id, action: cast.spell, cost, staff: cast };
}

/** What the staves are shown against: the spent resources. */
export interface StavesInPlay {
  readonly resources: ResourcesSpent;
}

/** The rank of each slot an entry has, by the key it is spent under. */
type SlotRanks = ReadonlyMap<SlotCountKey, SpellRank>;

function optionLine(option: StaffCommand, charges: number, ranks: SlotRanks): StaffCastOptionLine {
  return {
    slot: option.slot,
    charges,
    slotRank: option.slot === undefined ? undefined : ranks.get(option.slot),
  };
}

function spellLine(source: StaffSource, spell: StaffSource['spells'][number], context: LineContext): StaffSpellLine {
  const { id, spell: content, rank, charges, problem } = spell;
  return {
    key: id,
    id,
    name: content?.name ?? id,
    rank,
    charges,
    blocked: problem === undefined ? undefined : BLOCKS[problem],
    options: staffCastOptions(source, id, context.slots).map((option) =>
      optionLine(option, staffCastCost(option, spell), context.ranks),
    ),
    heightenedTo: rank === STAFF_CANTRIP ? staffCantripRank(context.level) : undefined,
  };
}

/** What a staff's lines are worked out against. */
interface LineContext {
  readonly slots: StaffSlots;
  readonly ranks: SlotRanks;
  readonly level: Character['document']['level'];
}

/** The staves the character holds as the spell list shows them: a section each, with the charges left and the casts. */
export function sheetStaves(registry: ContentRegistry, character: Character, { resources }: StavesInPlay): StaffLine[] {
  const entries = characterSpellcasting(characterGrants(character.document, sheetSlotContent(registry)));
  const items = itemContent(registry);
  const context: LineContext = {
    slots: { spent: resources.slots, maxima: sheetCounted(registry, character).slots },
    ranks: new Map(
      entries.flatMap(({ slug, slots }) =>
        slots.ranks.map(({ rank }): [SlotCountKey, SpellRank] => [slotCountKey(slug, undefined, rank), rank]),
      ),
    ),
    level: character.document.level,
  };
  return staffSources({
    inventory: character.document.inventory.items,
    items,
    spells: spellContent(registry),
    entries,
    charges: resources.staff,
  }).map((source): StaffLine => ({
    key: source.item.id,
    name: source.item.name ?? items.get(source.item.item)?.name ?? source.item.item,
    charges: source.charges,
    spells: source.spells.map((spell) => spellLine(source, spell, context)),
  }));
}
