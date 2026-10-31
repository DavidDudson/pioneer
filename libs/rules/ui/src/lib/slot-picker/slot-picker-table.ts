import type { PickerSort, TableColumn } from '@pioneer/frontier/data';
import {
  Attribute,
  LORE_CHOICE_PREFIX,
  LORE_NAME_MAX_LENGTH,
  LoreText,
  loreTopicSlug,
  Proficiency,
  Rarity,
} from '@pioneer/rules/sdk';

import { ATTRIBUTE_MESSAGES } from '../attributes/attributes-messages';
import { chips, shownBy } from '../origin-picker/origin-picker-table';
import type { NamedRow, Say, ShownRows } from '../origin-picker/origin-picker-table';
import { RARITY_TONES } from '../picker-cells/chip-list/chip-list.component';
import type { Chip } from '../picker-cells/chip-list/chip-list.component';
import { OriginTableSchema } from '../picker-cells/origin-table-schema';
import { PROFICIENCY_NAMES } from '../proficiency-rank/proficiency-rank-messages';
import { SLOT_RARITY_MESSAGES, SlotPickerMessage } from './slot-picker-messages';
import { SlotPickerColumn } from './slot-picker-row';
import type {
  AttributePickerRow,
  LanguagePickerRow,
  SkillPickerRow,
  SlotPickerFacts,
  SlotPickerRow,
} from './slot-picker-row';

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

/** The traits as chips, an entry above common rarity first and toned by it. */
function traitChips(facts: SlotPickerFacts | undefined, say: Say): readonly Chip[] {
  if (facts === undefined) {
    return [];
  }
  const traits = facts.traits.map((label): Chip => ({ label }));
  if (facts.rarity === Rarity.Common) {
    return traits;
  }
  return [{ label: say(SLOT_RARITY_MESSAGES[facts.rarity]), tone: RARITY_TONES[facts.rarity] }, ...traits];
}

/**
 * The columns of a slot picker: the name, then what its content entry says of itself (level, traits and summary), then
 * where it comes from. An option that no entry stands behind is the name alone, with empty cells.
 */
export function slotPickerColumns(say: Say): readonly TableColumn<SlotPickerRow>[] {
  return withName(new OriginTableSchema<SlotPickerRow>(), say)
    .addFacts({
      id: SlotPickerColumn.Level,
      header: say(SlotPickerMessage.Level),
      value: (row) => chips(row.facts?.level === undefined ? [] : [String(row.facts.level)]),
      width: 'sm',
    })
    .addTraits({
      id: 'traits',
      header: say(SlotPickerMessage.Traits),
      sortable: false,
      value: (row) => traitChips(row.facts, say),
      width: 'md',
    })
    .addSummary({
      id: 'summary',
      header: say(SlotPickerMessage.Summary),
      value: (row) => row.facts?.summary ?? [],
      width: 'lg',
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

/**
 * The columns of a skill picker: the skill, its governing attribute, the character's rank and modifier in it, and the
 * penalty the worn armour gives it.
 */
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
    .addFacts({
      id: SlotPickerColumn.ArmorPenalty,
      header: say(SlotPickerMessage.ArmorPenalty),
      value: (row) => chips(row.armorPenalty === undefined ? [] : [SIGNED.format(row.armorPenalty)]),
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

/** The columns of a language picker: the language, its rarity and script, whether the character knows it, and its source. */
export function languagePickerColumns(say: Say): readonly TableColumn<LanguagePickerRow>[] {
  return withName(new OriginTableSchema<LanguagePickerRow>(), say)
    .addFacts({
      id: SlotPickerColumn.Rarity,
      header: say(SlotPickerMessage.Rarity),
      value: (row) => chips([say(SLOT_RARITY_MESSAGES[row.rarity])]),
      width: 'sm',
    })
    .addFacts({
      id: SlotPickerColumn.Script,
      header: say(SlotPickerMessage.Script),
      value: (row) => chips(row.script === undefined ? [] : [row.script]),
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

/** How an option orders by a column: the level of its entry, those without one first, then name. */
function slotOrder(left: SlotPickerRow, right: SlotPickerRow, sort: PickerSort): number {
  return sort.column === SlotPickerColumn.Level ? (left.facts?.level ?? -1) - (right.facts?.level ?? -1) : 0;
}

/** How a skill orders by a column: the rank the character has in it, its modifier or its armor penalty, then name. */
function skillOrder(left: SkillPickerRow, right: SkillPickerRow, sort: PickerSort): number {
  if (sort.column === SlotPickerColumn.Rank) {
    return RANK_ORDER.indexOf(left.rank) - RANK_ORDER.indexOf(right.rank);
  }
  if (sort.column === SlotPickerColumn.ArmorPenalty) {
    return (left.armorPenalty ?? 0) - (right.armorPenalty ?? 0);
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

/** How a language orders by a column: how rare it is, or its script (those without one first), then name. */
function languageOrder(left: LanguagePickerRow, right: LanguagePickerRow, sort: PickerSort): number {
  if (sort.column === SlotPickerColumn.Rarity) {
    return RARITY_ORDER.indexOf(left.rarity) - RARITY_ORDER.indexOf(right.rarity);
  }
  return sort.column === SlotPickerColumn.Script ? (left.script ?? '').localeCompare(right.script ?? '') : 0;
}

/** The options whose name holds `query`, by name or level when asked. */
export const shownSlotRows: ShownRows<SlotPickerRow> = shownBy(slotOrder);

/** The skills whose name holds `query`, by name, rank, modifier or armor penalty when asked. */
export const shownSkillRows: ShownRows<SkillPickerRow> = shownBy(skillOrder);

/** The languages whose name holds `query`, by name, rarity or script when asked. */
export const shownLanguageRows: ShownRows<LanguagePickerRow> = shownBy(languageOrder);

/** The attributes whose name holds `query`, by name or modifier when asked. */
export const shownAttributeRows: ShownRows<AttributePickerRow> = shownBy(attributeOrder);

const LORE_WORD = /\s+lore$/iu;

/**
 * The row that adds what is typed in the search box as a Lore, when it names no skill or Lore the slot lists: picking
 * it picks `lore:<what was typed>`, which the builder keeps under its topic. A name is listed when it folds to the topic
 * of a listed one (`Sailing!`, `Säiling`). None for a name with no topic, or too long.
 */
export function typedLoreRow(query: string, rows: readonly SkillPickerRow[], say: Say): SkillPickerRow | undefined {
  const typed = query.trim();
  const topic = loreTopicSlug(LoreText.parse(typed));
  const listed = rows.some(({ name }) => loreTopicSlug(LoreText.parse(name)) === topic);
  if (topic === undefined || listed || typed.length > LORE_NAME_MAX_LENGTH) {
    return undefined;
  }
  return {
    id: `${LORE_CHOICE_PREFIX}${typed}`,
    name: say(SlotPickerMessage.AddLore, { name: typed.replace(LORE_WORD, '') }),
    attribute: Attribute.Intelligence,
    rank: Proficiency.Untrained,
    modifier: undefined,
    armorPenalty: undefined,
    disabledReason: undefined,
  };
}
