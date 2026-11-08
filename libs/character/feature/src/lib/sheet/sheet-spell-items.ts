import { CarryState, itemContent, spellContent, spellCost } from '@pioneer/character/domain';
import type { Character, TurnState } from '@pioneer/character/domain';
import { ActionCost, ConsumableCategory, ContentKind, STAFF_CANTRIP } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry, SpellRank } from '@pioneer/rules/sdk';
import { SpellListMessage } from '@pioneer/rules/ui';
import type { SpellDetailLine, SpellRowLine, StaffLine, StaffSpellLine, Translate, WandLine } from '@pioneer/rules/ui';

import { affordability } from './sheet-actions';
import { sheetSpellDetail } from './sheet-spell-details';

/** The message each kind of item words its row's source with. */
const SOURCE_MESSAGES = {
  wand: 'character.sheet.spellItems.wand',
  staff: 'character.sheet.spellItems.staff',
} as const;

/** What the rows of items are worded with. */
export interface ItemWords {
  readonly translate: Translate;
}

/** A spell as a row details it, worded for the item it is cast from; undefined for a spell the registry doesn't hold. */
/** How a spell is worded as a row: whether it is a cantrip, where it comes from and in what words. */
interface RowWords extends ItemWords {
  readonly cantrip: boolean;
  readonly source: string;
}

function detailOf(
  registry: ContentRegistry,
  spell: { readonly id: ContentId; readonly name: string; readonly rank: SpellRank },
  { translate, cantrip, source }: RowWords,
): SpellDetailLine | undefined {
  return sheetSpellDetail(
    registry,
    { ...spell, tags: cantrip ? [SpellListMessage.TagCantrip] : [], source },
    translate,
  );
}

/** One row for each wand the character holds, the spell it casts with its casts left as the source. */
export function wandRows(registry: ContentRegistry, wands: readonly WandLine[], words: ItemWords): SpellRowLine[] {
  return wands.flatMap((wand): SpellRowLine[] => {
    const source = words.translate(SOURCE_MESSAGES.wand, { name: wand.name, ...wand.use });
    const detail = detailOf(
      registry,
      { id: wand.id, name: wand.spell, rank: wand.rank },
      { ...words, cantrip: false, source },
    );
    return detail === undefined ? [] : [{ key: `wand:${wand.key}`, detail, item: { kind: 'wand', wand } }];
  });
}

/** The rank a staff's spell is cast at: a cantrip at the rank it is heightened to. */
function castRank(spell: StaffSpellLine): SpellRank | undefined {
  return spell.rank === STAFF_CANTRIP ? spell.heightenedTo : spell.rank;
}

/** One row for each spell of each staff the character holds, the staff with its charges left as the source. */
export function staffRows(registry: ContentRegistry, staves: readonly StaffLine[], words: ItemWords): SpellRowLine[] {
  return staves.flatMap((staff) =>
    staff.spells.flatMap((spell): SpellRowLine[] => {
      const rank = castRank(spell);
      const source =
        staff.charges === undefined
          ? staff.name
          : words.translate(SOURCE_MESSAGES.staff, { name: staff.name, ...staff.charges });
      const detail =
        rank === undefined
          ? undefined
          : detailOf(
              registry,
              { id: spell.id, name: spell.name, rank },
              { ...words, cantrip: spell.rank === STAFF_CANTRIP, source },
            );
      return detail === undefined
        ? []
        : [
            {
              key: `staff:${staff.key}:${spell.key}`,
              detail,
              item: { kind: 'staff', staff: staff.key, prepared: staff.charges !== undefined, spell },
            },
          ];
    }),
  );
}

/** A scroll the character holds: the spell it casts and the cost of casting it. */
export interface ScrollSource {
  /** The inventory item that holds the stack. */
  readonly key: string;
  readonly name: string;
  readonly quantity: number;
  readonly spell: ContentId;
  /** The content the item is, which the spend names. */
  readonly entry: ContentId;
  readonly rank: SpellRank;
}

/** The scrolls the character has in hand, in inventory order: a scroll is cast from the hand. */
export function scrollSources(registry: ContentRegistry, character: Character): readonly ScrollSource[] {
  const items = itemContent(registry);
  return character.document.inventory.items.flatMap((held): readonly ScrollSource[] => {
    const entry = items.get(held.item);
    const spell = entry?.kind === ContentKind.Consumable ? entry.data.spell : undefined;
    return entry?.kind === ContentKind.Consumable &&
      entry.data.category === ConsumableCategory.Scroll &&
      spell !== undefined &&
      (held.carry.state === CarryState.Held || held.carry.state === CarryState.Worn)
      ? [
          {
            key: held.id,
            name: held.name ?? entry.name,
            quantity: held.quantity,
            spell: spell.spell,
            entry: entry.id,
            rank: spell.rank,
          },
        ]
      : [];
  });
}

/** What the rows of scrolls are worded with and checked against: the turn that pays for the cast. */
export interface ScrollWords extends ItemWords {
  readonly turn: TurnState | undefined;
}

/** One row for each scroll held, the scroll as the source, castable while the turn can pay for its spell. */
export function scrollRows(
  registry: ContentRegistry,
  scrolls: readonly ScrollSource[],
  { turn, translate }: ScrollWords,
): SpellRowLine[] {
  const spells = spellContent(registry);
  return scrolls.flatMap((scroll): SpellRowLine[] => {
    const option = spells.anySpell(scroll.spell);
    const range = option === undefined ? undefined : spellCost(option);
    const castable = affordability(turn, range?.cost ?? ActionCost.Free, undefined).affordable ?? true;
    const detail = detailOf(
      registry,
      { id: scroll.spell, name: option?.name ?? scroll.name, rank: scroll.rank },
      { translate, cantrip: false, source: scroll.name },
    );
    return detail === undefined
      ? []
      : [{ key: `scroll:${scroll.key}`, detail, item: { kind: 'scroll', scroll: { key: scroll.key, castable } } }];
  });
}
