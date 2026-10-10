import { slotKeyOf } from '@pioneer/rules/grants';
import type { AnsweredSlot, ChoicePicks, ChoiceSlot, OfferedOption } from '@pioneer/rules/grants';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import { ContentId, RuleElementKey, RuleIndex, Slug } from '@pioneer/rules/sdk';
import type { ChoiceSetElement, ChoiceValue, RuleElement, SlotKey } from '@pioneer/rules/sdk';

/** A pick as typed: the entry's slug and the `ChoiceSet`'s rule index, then the picked value: `fighter:4 = double-slice`. */
const PICK_LINE = /^(?<entry>[^:\s]+):(?<rule>\d+)\s*=\s*(?<value>\S+)$/u;
const LINE = /\r?\n/u;
const PICK_SEPARATOR = ' = ';

/** Names a playground slot as typed: the entry's slug and the rule index. */
const slotName = (entry: Slug, rule: RuleIndex): string => `${entry}:${rule}`;

/** Converts between playground slugs and the ids stored content uses. */
export interface SlugTable {
  readonly idOf: (slug: Slug) => ContentId;
  /** The slug of a playground entry's id; undefined for an id no entry has. */
  readonly slugOf: (id: ContentId) => Slug | undefined;
  readonly has: (slug: Slug) => boolean;
}

/** A pick value as typed: an entry's slug stands for its id; any other slug is a plain option. */
function valueOf(slug: Slug, table: SlugTable): ChoiceValue {
  return table.has(slug) ? table.idOf(slug) : slug;
}

/** A value as the playground shows it: an entry's id as its slug. */
function shownValue(value: ChoiceValue, table: SlugTable): string {
  const id = ContentId.safeParse(value);
  return id.success ? (table.slugOf(id.data) ?? value) : value;
}

export interface PicksParse {
  readonly picks: ChoicePicks;
  /** The 1-based lines that are not `entry:rule = value`. */
  readonly bad: readonly number[];
}

/** Each filled line as a pick; a later line for the same slot wins. */
export function parsePicks(text: string, table: SlugTable): PicksParse {
  const picks = new Map<SlotKey, ChoiceValue>();
  const bad: number[] = [];
  for (const [index, raw] of text.split(LINE).entries()) {
    const line = raw.trim();
    const groups = PICK_LINE.exec(line)?.groups;
    const entry = Slug.safeParse(groups?.['entry']);
    const rule = RuleIndex.safeParse(Number(groups?.['rule']));
    const value = Slug.safeParse(groups?.['value']);
    if (entry.success && rule.success && value.success) {
      picks.set(slotKeyOf(table.idOf(entry.data), rule.data), valueOf(value.data, table));
    } else if (line !== '') {
      bad.push(index + 1);
    }
  }
  return { picks, bad };
}

/** The slot a typed line picks for, as typed (`fighter:4`); undefined for a line that is not a pick. */
function slotOfLine(line: string): string | undefined {
  const groups = PICK_LINE.exec(line.trim())?.groups;
  return groups === undefined ? undefined : `${groups['entry']}:${groups['rule']}`;
}

/** `text` with `slot`'s line replaced by `slot = value` at the end, and blank lines dropped. */
export function withPick(text: string, slot: string, value: string): string {
  const others = text.split(LINE).filter((line) => line.trim() !== '' && slotOfLine(line) !== slot);
  return [...others, `${slot}${PICK_SEPARATOR}${value}`].join('\n');
}

/** A `ChoiceSet` option that names a playground entry by slug names it by id, as stored content does. */
export function choiceSlugsToIds(element: RuleElement, table: SlugTable): RuleElement {
  if (element.key !== RuleElementKey.ChoiceSet || !Array.isArray(element.choices)) {
    return element;
  }
  const choices = element.choices.map((option) => {
    const slug = Slug.safeParse(option.value);
    return slug.success ? { ...option, value: valueOf(slug.data, table) } : option;
  });
  const converted: ChoiceSetElement = { ...element, choices };
  return converted;
}

export interface OptionRow {
  readonly value: string;
  readonly label: string;
  readonly summary: PredicateSummary | undefined;
}

/** A choice as the playground shows it: its slot as typed, what it asks, and the chain to its entry. */
export interface ChoiceRow {
  readonly slot: string;
  readonly title: string;
  readonly via: readonly string[];
  readonly options: readonly OptionRow[];
  /** The picked value as typed, for an answered slot. */
  readonly pick: string | undefined;
}

/** How a slot reads in the playground: the entry's name, the names along its chain, and the slugs. */
export interface ChoiceContext {
  readonly entryName: string;
  readonly via: readonly string[];
  readonly table: SlugTable;
}

/** Shows a slot with its slot as typed and its values as slugs; the prompt, or else the entry's name, is its title. */
export function choiceRow(slot: ChoiceSlot | AnsweredSlot, { entryName, via, table }: ChoiceContext): ChoiceRow {
  const entry = table.slugOf(slot.origin.entry);
  const option = ({ value, label, summary }: OfferedOption): OptionRow => ({
    value: shownValue(value, table),
    label,
    summary,
  });
  return {
    slot: entry === undefined ? slot.key : slotName(entry, slot.rule),
    title: slot.prompt ?? entryName,
    via,
    options: slot.options.map(option),
    pick: 'pick' in slot ? shownValue(slot.pick, table) : undefined,
  };
}
