import {
  BlockKind,
  contentKey,
  ContentKind,
  InlineKind,
  STAFF_CANTRIP,
  StaffRank,
  StaffSpells,
  TextMark,
  Trait,
} from '@pioneer/rules/sdk';
import type {
  BlockNode,
  ContentEntry,
  ContentId,
  ContentKey,
  InlineNode,
  ListNode,
  StaffRankSpells,
  TextNode,
} from '@pioneer/rules/sdk';

/** The trait that marks a staff; every staff in the packs also has `magical`. */
export const STAFF_TRAIT = Trait.parse('staff');

/** The longest spell name, in words, the matcher looks for ("Elemental Absorption", "Cursed Metamorphosis"). */
const NAME_WORDS_MAX = 6;
/** Segmentations kept per position: two are enough to tell a clean list from an ambiguous one. */
const SEGMENTATIONS_KEPT = 2;

/** "Cantrip", "Cantrips", "1st", "2nd", "10th". */
const RANK_LABEL = /^(?:(?<cantrip>cantrips?)|(?<rank>\d{1,2})(?:st|nd|rd|th))$/iu;

/** Spell ids by lowercase name; a name shared by two spells maps to both, so a list naming it is left alone. */
export type SpellIndex = ReadonlyMap<string, readonly ContentId[]>;

/** Lowercase words with straight apostrophes, so "Warrior’s Regret" finds "Warrior's Regret". */
function normalise(words: string): string {
  return words.replaceAll('’', "'").replaceAll(/\s+/gu, ' ').trim().toLowerCase();
}

/** The spells in `entries` by name. */
export function spellIndex(entries: readonly ContentEntry[]): SpellIndex {
  const byName = new Map<string, ContentId[]>();
  for (const entry of entries) {
    if (entry.kind === ContentKind.Spell) {
      const name = normalise(entry.name);
      byName.set(name, [...(byName.get(name) ?? []), entry.id]);
    }
  }
  return byName;
}

/** Whether `entry` is a staff by its content: a weapon or an item with the staff trait. */
export function isStaffEntry(entry: ContentEntry): boolean {
  return (
    (entry.kind === ContentKind.Weapon || entry.kind === ContentKind.Equipment) && entry.traits.includes(STAFF_TRAIT)
  );
}

/** The ways a run of words splits into spell names: at most `SEGMENTATIONS_KEPT` are kept. */
type Splits = readonly (readonly ContentId[])[];

/** A spell name that ends just before word `end`. */
interface NameEnd {
  readonly end: number;
  readonly spell: ContentId;
}

/** The spells whose names start at word `start`: only a name that is exactly one spell counts. */
function namesAt(words: readonly string[], spells: SpellIndex, start: number): readonly NameEnd[] {
  const last = Math.min(words.length, start + NAME_WORDS_MAX);
  const ends = Array.from({ length: last - start }, (_unused, offset) => start + offset + 1);
  return ends.flatMap((end): NameEnd[] => {
    const [spell, ...others] = spells.get(words.slice(start, end).join(' ')) ?? [];
    return spell !== undefined && others.length === 0 ? [{ end, spell }] : [];
  });
}

function prepend(spell: ContentId, rest: readonly ContentId[]): readonly ContentId[] {
  return [spell, ...rest];
}

/** The one way `words` split into spell names, or undefined when there is none or more than one. */
function segment(words: readonly string[], spells: SpellIndex): readonly ContentId[] | undefined {
  const memo = new Map<number, Splits>();
  const from = (start: number): Splits => {
    if (start === words.length) {
      return [[]];
    }
    const cached = memo.get(start);
    const found =
      cached ??
      namesAt(words, spells, start).flatMap(({ end, spell }) => from(end).map((rest) => prepend(spell, rest)));
    const kept = found.slice(0, SEGMENTATIONS_KEPT);
    memo.set(start, kept);
    return kept;
  };
  const [only, ...ambiguous] = from(0);
  return ambiguous.length === 0 ? only : undefined;
}

/** The spells a run of text names, comma-separated or just run together, or undefined when any of it is unknown. */
function textSpells(text: string, spells: SpellIndex): readonly ContentId[] | undefined {
  const chunks = text.split(',').map((chunk) => normalise(chunk));
  const parts = chunks.filter((chunk) => chunk !== '').map((chunk) => segment(chunk.split(' '), spells));
  return parts.every((part) => part !== undefined) ? parts.flat() : undefined;
}

/** The rank an item's bold label names: "Cantrip", "3rd". */
function labelRank(label: string): StaffRank | undefined {
  const groups = RANK_LABEL.exec(label.trim())?.groups;
  if (groups === undefined) {
    return undefined;
  }
  return groups['cantrip'] === undefined ? StaffRank.safeParse(Number(groups['rank'])).data : STAFF_CANTRIP;
}

function isStrongText(node: InlineNode | undefined): node is TextNode {
  return node?.type === InlineKind.Text && node.marks?.includes(TextMark.Strong) === true;
}

/** One list item: "**3rd** Fireball, Haste" as its rank and spells, or undefined when it is anything else. */
function itemSpells(item: readonly BlockNode[], spells: SpellIndex): StaffRankSpells | undefined {
  const [block, ...others] = item;
  if (block?.type !== BlockKind.Paragraph || others.length > 0) {
    return undefined;
  }
  const [label, ...rest] = block.content;
  const rank = isStrongText(label) ? labelRank(label.text) : undefined;
  if (rank === undefined) {
    return undefined;
  }
  const named = rest.map((node) =>
    node.type === InlineKind.Text && node.marks === undefined ? textSpells(node.text, spells) : undefined,
  );
  const ids = named.every((part) => part !== undefined) ? named.flat() : undefined;
  return ids === undefined || ids.length === 0 ? undefined : { rank, spells: ids };
}

/** The list a staff prints its spells in: the one list whose every item opens with a rank label. */
function spellList(entry: ContentEntry): ListNode | undefined {
  const lists = entry.description.filter((block): block is ListNode => block.type === BlockKind.List);
  return lists.length === 1 ? lists[0] : undefined;
}

/**
 * The spells a staff prints under its ranks ("**Cantrip** Ignition", "**3rd** Floating Flame, Fireball"), as the
 * schema keeps them, or undefined when its description has no such list or any name in it isn't one spell the packs
 * hold (a parenthesised note, a name two spells share, a word the matcher can't place).
 */
export function matchStaffSpells(entry: ContentEntry, spells: SpellIndex): StaffSpells | undefined {
  const list = spellList(entry);
  if (list === undefined) {
    return undefined;
  }
  const items = list.items.map((item) => itemSpells(item, spells));
  const read = items.every((item) => item !== undefined) ? items : undefined;
  const parsed = StaffSpells.safeParse(read?.map(({ rank, spells: ids }) => ({ rank, spells: [...new Set(ids)] })));
  return parsed.success ? parsed.data : undefined;
}

/** The spells the matcher read for one staff. */
export interface StaffMatch {
  readonly entry: ContentKey;
  readonly staff: StaffSpells;
}

/** The staff data an entry already has, set by an earlier pass or by hand. */
function hasStaff(entry: ContentEntry): boolean {
  return (entry.kind === ContentKind.Weapon || entry.kind === ContentKind.Equipment) && entry.data.staff !== undefined;
}

/**
 * For each staff with no spells yet, the spells its description lists. A staff that has them keeps them, so a hand
 * correction is never overwritten; a staff whose list the matcher can't read is left for the coverage report.
 */
export function staffMatches(entries: readonly ContentEntry[]): readonly StaffMatch[] {
  const spells = spellIndex(entries);
  return entries.flatMap((entry) => {
    if (!isStaffEntry(entry) || hasStaff(entry)) {
      return [];
    }
    const staff = matchStaffSpells(entry, spells);
    return staff === undefined ? [] : [{ entry: contentKey(entry.pack, entry.slug), staff }];
  });
}
