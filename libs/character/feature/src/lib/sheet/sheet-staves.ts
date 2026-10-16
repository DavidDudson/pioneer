import {
  characterGrants,
  characterSpellcasting,
  itemContent,
  PlayCommandField,
  slotCountKey,
  spellContent,
  StaffCommandField,
  staffCantripRank,
  staffCastCost,
  staffCastOptions,
  staffCastProblem,
  StaffSpellProblem,
  staffSources,
} from '@pioneer/character/domain';
import type {
  Character,
  InventoryItemId,
  SlotCountKey,
  ResourcesSpent,
  StaffCommand,
  StaffSlots,
  StaffSource,
} from '@pioneer/character/domain';
import { STAFF_CANTRIP } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry, SpellRank } from '@pioneer/rules/sdk';
import { StaffSpellBlock } from '@pioneer/rules/ui';
import type { StaffCastOptionLine, StaffLine, StaffSpellLine, StaffUndoLine } from '@pioneer/rules/ui';

import { sheetCounted } from './sheet-counted';
import { sheetSlotContent } from './sheet-slot-content';

/** What stops a spell of a staff being cast, as the list words it. */
const BLOCKS: Readonly<Record<StaffSpellProblem, StaffSpellBlock>> = {
  [StaffSpellProblem.NotOnList]: StaffSpellBlock.NotOnList,
  [StaffSpellProblem.RankTooHigh]: StaffSpellBlock.RankTooHigh,
};

/** The command that casts `spell` from the staff `item`, paying the charge with `slot` when it is given. */
export function castStaffCommand(
  item: InventoryItemId,
  spell: ContentId,
  slot: SlotCountKey | undefined,
): StaffCommand {
  const base = { field: PlayCommandField.CastStaff, item, spell };
  return slot === undefined ? base : { ...base, slot };
}

/** The command that takes back the staff cast `cast`. */
export function uncastStaffCommand(cast: StaffCommand): StaffCommand {
  return { ...cast, field: StaffCommandField.UncastStaff };
}

/** What the staves are shown against: the spent resources and the cast the player may still take back. */
export interface StavesInPlay {
  readonly resources: ResourcesSpent;
  readonly last: StaffCommand | undefined;
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
  readonly last: StaffCommand | undefined;
}

/** The last cast, when it was made with this staff and taking it back would still pass. */
function undoLine(source: StaffSource, { last, slots, ranks }: LineContext): StaffUndoLine | undefined {
  if (last?.item !== source.item.id) {
    return undefined;
  }
  const spell = source.spells.find(({ id }) => id === last.spell);
  const taken = uncastStaffCommand(last);
  if (spell === undefined || staffCastProblem(taken, source, slots) !== undefined) {
    return undefined;
  }
  return {
    spell: spell.spell?.name ?? spell.id,
    charges: staffCastCost(taken, spell),
    slotRank: last.slot === undefined ? undefined : ranks.get(last.slot),
  };
}

/** The staves the character holds as the spell list shows them: a section each, with the charges left and the casts. */
export function sheetStaves(
  registry: ContentRegistry,
  character: Character,
  { resources, last }: StavesInPlay,
): StaffLine[] {
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
    last,
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
    undo: undoLine(source, context),
  }));
}
