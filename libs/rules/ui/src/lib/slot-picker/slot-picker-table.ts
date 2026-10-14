import type { PickerSort, TableColumn } from '@pioneer/frontier/data';

import { ATTRIBUTE_MESSAGES } from '../attributes/attributes-messages';
import { chips, shownBy } from '../origin-picker/origin-picker-table';
import type { NamedRow, Say, ShownRows } from '../origin-picker/origin-picker-table';
import { OriginTableSchema } from '../picker-cells/origin-table-schema';
import { PROFICIENCY_NAMES } from '../proficiency-rank/proficiency-rank-messages';
import { SLOT_RARITY_MESSAGES, SlotPickerMessage } from './slot-picker-messages';
import { SlotPickerColumn } from './slot-picker-row';
import type { AttributePickerRow, LanguagePickerRow, SkillPickerRow, SlotPickerRow } from './slot-picker-row';

/** A modifier with its sign, in the active language: +3, 0, -1. */
const SIGNED = new Intl.NumberFormat(undefined, { signDisplay: 'exceptZero' });

/** How far up the ranks each is, so a skill sorts by training. */
const RANK_ORDER: readonly string[] = Object.keys(PROFICIENCY_NAMES);

/** How rare each rarity is, so a language sorts from common to unique. */
const RARITY_ORDER: readonly string[] = Object.keys(SLOT_RARITY_MESSAGES);

/** The name column every slot picker starts with. */
function withName<TRow extends NamedRow>(schema: OriginTableSchema<TRow>, say: Say): OriginTableSchema<TRow> {
  return schema.addText({
    id: SlotPickerColumn.Name,
    header: say(SlotPickerMessage.Name),
    value: (row) => row.name,
    width: 'md',
  });
}

/**
 * The columns of a slot picker: the name, then where its content entry comes from. An option that no entry stands
 * behind is the name alone.
 */
export function slotPickerColumns(say: Say): readonly TableColumn<SlotPickerRow>[] {
  return withName(new OriginTableSchema<SlotPickerRow>(), say)
    .addSource({
      id: 'source',
      header: say(SlotPickerMessage.Source),
      sortable: false,
      value: (row) => row.sources,
      width: 'md',
    })
    .build();
}

/** The columns of a skill picker: the skill, its governing attribute, the character's rank and modifier in it. */
export function skillPickerColumns(say: Say): readonly TableColumn<SkillPickerRow>[] {
  return withName(new OriginTableSchema<SkillPickerRow>(), say)
    .addFacts({
      id: 'attribute',
      header: say(SlotPickerMessage.Attribute),
      sortable: false,
      value: (row) => chips(row.attribute === undefined ? [] : [say(ATTRIBUTE_MESSAGES[row.attribute])]),
      width: 'sm',
    })
    .addFacts({
      id: SlotPickerColumn.Rank,
      header: say(SlotPickerMessage.Rank),
      value: (row) => chips([say(PROFICIENCY_NAMES[row.rank])]),
      width: 'sm',
    })
    .addFacts({
      id: SlotPickerColumn.Modifier,
      header: say(SlotPickerMessage.Modifier),
      value: (row) => chips(row.modifier === undefined ? [] : [SIGNED.format(row.modifier)]),
      width: 'sm',
    })
    .build();
}

/** The columns of an attribute picker: the attribute, the modifier now and the modifier the boost would give. */
export function attributePickerColumns(say: Say): readonly TableColumn<AttributePickerRow>[] {
  return withName(new OriginTableSchema<AttributePickerRow>(), say)
    .addFacts({
      id: SlotPickerColumn.Modifier,
      header: say(SlotPickerMessage.Modifier),
      value: (row) => chips([SIGNED.format(row.modifier)]),
      width: 'sm',
    })
    .addFacts({
      id: SlotPickerColumn.Boosted,
      header: say(SlotPickerMessage.Boosted),
      value: (row) => chips([SIGNED.format(row.boosted)]),
      width: 'sm',
    })
    .build();
}

/** The columns of a language picker: the language, its rarity, whether the character knows it, and its source. */
export function languagePickerColumns(say: Say): readonly TableColumn<LanguagePickerRow>[] {
  return withName(new OriginTableSchema<LanguagePickerRow>(), say)
    .addFacts({
      id: SlotPickerColumn.Rarity,
      header: say(SlotPickerMessage.Rarity),
      value: (row) => chips([say(SLOT_RARITY_MESSAGES[row.rarity])]),
      width: 'sm',
    })
    .addFacts({
      id: 'known',
      header: say(SlotPickerMessage.Known),
      sortable: false,
      value: (row) => chips([say(row.known ? SlotPickerMessage.KnownYes : SlotPickerMessage.KnownNo)]),
      width: 'sm',
    })
    .addSource({
      id: 'source',
      header: say(SlotPickerMessage.Source),
      sortable: false,
      value: (row) => row.sources,
      width: 'md',
    })
    .build();
}

/** How a skill orders by a column: the rank the character has in it, or its modifier, then name. */
function skillOrder(left: SkillPickerRow, right: SkillPickerRow, sort: PickerSort): number {
  if (sort.column === SlotPickerColumn.Rank) {
    return RANK_ORDER.indexOf(left.rank) - RANK_ORDER.indexOf(right.rank);
  }
  return sort.column === SlotPickerColumn.Modifier ? (left.modifier ?? 0) - (right.modifier ?? 0) : 0;
}

/** How an attribute orders by a column: the modifier now, or the modifier once boosted, then name. */
function attributeOrder(left: AttributePickerRow, right: AttributePickerRow, sort: PickerSort): number {
  if (sort.column === SlotPickerColumn.Modifier) {
    return left.modifier - right.modifier;
  }
  return sort.column === SlotPickerColumn.Boosted ? left.boosted - right.boosted : 0;
}

/** How a language orders by a column: how rare it is, then name. */
function languageOrder(left: LanguagePickerRow, right: LanguagePickerRow, sort: PickerSort): number {
  return sort.column === SlotPickerColumn.Rarity
    ? RARITY_ORDER.indexOf(left.rarity) - RARITY_ORDER.indexOf(right.rarity)
    : 0;
}

/** The options whose name holds `query`, by name when asked. */
export const shownSlotRows: ShownRows<SlotPickerRow> = shownBy(() => 0);

/** The skills whose name holds `query`, by name, rank or modifier when asked. */
export const shownSkillRows: ShownRows<SkillPickerRow> = shownBy(skillOrder);

/** The languages whose name holds `query`, by name or rarity when asked. */
export const shownLanguageRows: ShownRows<LanguagePickerRow> = shownBy(languageOrder);

/** The attributes whose name holds `query`, by name or modifier when asked. */
export const shownAttributeRows: ShownRows<AttributePickerRow> = shownBy(attributeOrder);
