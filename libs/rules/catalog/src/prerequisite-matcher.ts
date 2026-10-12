import {
  Attribute,
  BlockKind,
  contentKey,
  ContentKind,
  InlineKind,
  Predicate,
  PredicateNumber,
  Proficiency,
  RollOption,
} from '@pioneer/rules/sdk';
import type { ContentEntry, ContentKey, PredicateStatement, RichText } from '@pioneer/rules/sdk';

import { NAMED_KINDS, normalise, prerequisiteNames } from './prerequisite-names';
import type { PrerequisiteNames } from './prerequisite-names';

/**
 * A word after a name that says which kind it is: "leaf leshy heritage", "Cat Fall skill feat". A bard's muse, a
 * rogue's racket and a cleric's doctrine are class features named without the word ("warrior muse" is Warrior).
 */
const KIND_WORDS: ReadonlyMap<string, readonly ContentKind[]> = new Map([
  ['feat', [ContentKind.Feat]],
  ['skill feat', [ContentKind.Feat]],
  ['ancestry feat', [ContentKind.Feat]],
  ['class feat', [ContentKind.Feat]],
  ['heritage', [ContentKind.Heritage]],
  ['ancestry', [ContentKind.Ancestry]],
  ['class', [ContentKind.Class]],
  ['deity', [ContentKind.Deity]],
  ['muse', [ContentKind.ClassFeature]],
  ['racket', [ContentKind.ClassFeature]],
  ['doctrine', [ContentKind.ClassFeature]],
]);

const ATTRIBUTE_WORDS: ReadonlyMap<string, Attribute> = new Map([
  ['strength', Attribute.Strength],
  ['dexterity', Attribute.Dexterity],
  ['constitution', Attribute.Constitution],
  ['intelligence', Attribute.Intelligence],
  ['wisdom', Attribute.Wisdom],
  ['charisma', Attribute.Charisma],
]);

/** A rank word as Foundry numbers it in `skill:<skill>:rank`: trained 1 to legendary 4. */
const RANK_WORDS: ReadonlyMap<string, number> = new Map(
  Object.values(Proficiency).map((rank, index): [string, number] => [rank, index]),
);

/** The traits a prerequisite names on the character (ADR-0048): `self:trait:holy`. */
const TRAIT_WORDS: ReadonlySet<string> = new Set(['holy', 'unholy']);

const RANK_CLAUSE = /^(?<rank>trained|expert|master|legendary) in (?<statistics>.+)$/u;
const ATTRIBUTE_CLAUSE = /^(?<attribute>[a-z]+) \+(?<modifier>\d)$/u;
/** "8th level" (any ordinal suffix) or "level 8". */
const LEVEL_CLAUSE = /^(?:(?<ordinal>\d+)[a-z]{2} level|level (?<plain>\d+))$/u;
const TRAIT_SUFFIX = / trait$/u;
/** The words joining a list's last item: "A, B, or C", "A or B", "A and B". Text is normalised to single spaces. */
const LIST_JOIN = /,? (?:or|and) /gu;
const OR_JOIN = / or /u;
const AND_JOIN = / and /u;

/** How a list's items combine; undefined for one item, or a list that mixes "and" and "or". */
type Conjunction = 'and' | 'or';

interface ListOf {
  readonly items: readonly string[];
  readonly conjunction: Conjunction | undefined;
}

/** "A, B, or C" as its items and how they combine; undefined when it mixes "and" and "or". */
function listOf(words: string): ListOf | undefined {
  const items = words.replaceAll(LIST_JOIN, ', ').split(', ');
  if (items.length === 1) {
    return { items, conjunction: undefined };
  }
  const or = OR_JOIN.test(words);
  const and = AND_JOIN.test(words);
  if (or === and) {
    // Both, or neither ("A, B"): which one holds is not said.
    return undefined;
  }
  return { items, conjunction: or ? 'or' : 'and' };
}

/** The statements for each item, combined as the list says; undefined when any item does not parse. */
function combined(
  words: string,
  item: (each: string) => PredicateStatement | undefined,
): readonly PredicateStatement[] | undefined {
  const list = listOf(words);
  const statements = list?.items.map((each) => item(each));
  if (list === undefined || statements === undefined || !statements.every((each) => each !== undefined)) {
    return undefined;
  }
  return list.conjunction === 'or' ? [{ or: statements }] : statements;
}

/** At least `rank` in one statistic: `{ "gte": ["skill:athletics:rank", 1] }`. */
function rankStatement(statistic: string, rank: number, names: PrerequisiteNames): PredicateStatement | undefined {
  const selector = names.statistics.get(statistic);
  const option = RollOption.safeParse(`${selector}:rank`);
  return selector === undefined || !option.success ? undefined : { gte: [option.data, PredicateNumber.parse(rank)] };
}

/** "trained in Athletics", "master in Arcana, Nature, Occultism, or Religion", "trained in Nature and Religion". */
function rankClause(clause: string, names: PrerequisiteNames): readonly PredicateStatement[] | undefined {
  const { rank, statistics } = RANK_CLAUSE.exec(clause)?.groups ?? {};
  if (rank === undefined || statistics === undefined) {
    return undefined;
  }
  const value = RANK_WORDS.get(rank) ?? 0;
  return combined(statistics, (statistic) => rankStatement(statistic, value, names));
}

/** "Strength +2": `{ "gte": ["attribute:str:mod", 2] }`, as Foundry writes it. */
function attributeClause(clause: string): readonly PredicateStatement[] | undefined {
  const { attribute: word, modifier } = ATTRIBUTE_CLAUSE.exec(clause)?.groups ?? {};
  const attribute = word === undefined ? undefined : ATTRIBUTE_WORDS.get(word);
  if (attribute === undefined || modifier === undefined) {
    return undefined;
  }
  return [{ gte: [RollOption.parse(`attribute:${attribute}:mod`), PredicateNumber.parse(Number(modifier))] }];
}

/** "8th level": `{ "gte": ["self:level", 8] }`. */
function levelClause(clause: string): readonly PredicateStatement[] | undefined {
  const { ordinal, plain } = LEVEL_CLAUSE.exec(clause)?.groups ?? {};
  const level = ordinal ?? plain;
  return level === undefined
    ? undefined
    : [{ gte: [RollOption.parse('self:level'), PredicateNumber.parse(Number(level))] }];
}

/** "holy", "unholy trait", "holy or unholy trait": `self:trait:holy`. */
function traitClause(clause: string): readonly PredicateStatement[] | undefined {
  return combined(clause.replace(TRAIT_SUFFIX, ''), (word) =>
    TRAIT_WORDS.has(word) ? RollOption.parse(`self:trait:${word}`) : undefined,
  );
}

/** The kinds a name may be, and the name without the word that said so. */
interface NameOf {
  readonly name: string;
  readonly kinds: readonly ContentKind[];
}

/** "leaf leshy heritage" is the heritage Leaf Leshy; a name with no kind word may be any named kind. */
function namesOf(item: string): readonly NameOf[] {
  const hinted = [...KIND_WORDS].flatMap(([word, kinds]) =>
    item.endsWith(` ${word}`) ? [{ name: item.slice(0, -word.length - 1), kinds }] : [],
  );
  return [{ name: item, kinds: NAMED_KINDS }, ...hinted];
}

/**
 * The option a named entry sets, or of several with that name (the feat Shield Block and the fighter's class feature),
 * any of theirs. Undefined when nothing has the name.
 */
function nameStatement(item: string, names: PrerequisiteNames): PredicateStatement | undefined {
  for (const { name, kinds } of namesOf(item)) {
    const options = (names.entries.get(name) ?? names.variants.get(name) ?? [])
      .filter(({ kind }) => kinds.includes(kind))
      .map(({ option }) => option);
    const [only] = options;
    if (only !== undefined) {
      return options.length === 1 ? only : { or: options };
    }
  }
  return undefined;
}

/** "Shield Block", "Rogue Dedication or Swashbuckler Dedication", "leaf order or Untamed Form". */
function nameClause(clause: string, names: PrerequisiteNames): readonly PredicateStatement[] | undefined {
  const whole = nameStatement(clause, names);
  return whole === undefined ? combined(clause, (item) => nameStatement(item, names)) : [whole];
}

/** One clause of a feat's prerequisites as statements; undefined when the matcher doesn't know its shape. */
function clauseStatements(clause: string, names: PrerequisiteNames): readonly PredicateStatement[] | undefined {
  return (
    rankClause(clause, names) ??
    attributeClause(clause) ??
    levelClause(clause) ??
    traitClause(clause) ??
    nameClause(clause, names)
  );
}

/** A feat's prerequisites read: the predicate when every clause parsed, and the clauses that didn't. */
export interface PrerequisiteReading {
  readonly predicate: Predicate | undefined;
  readonly unparsed: readonly string[];
}

/** The prerequisites as plain words, or undefined when they are anything richer than one paragraph of text. */
function prerequisiteWords(prerequisites: RichText): string | undefined {
  const [block, ...rest] = prerequisites;
  if (block?.type !== BlockKind.Paragraph || rest.length > 0) {
    return undefined;
  }
  const words = block.content.map((node) => (node.type === InlineKind.Text ? node.text : undefined));
  return words.every((word) => word !== undefined) ? words.join('') : undefined;
}

/**
 * A feat's prerequisites as a predicate (content-model.md, "Prerequisites"). The text is clauses joined by `;`, as
 * the import writes Foundry's list, each of which must hold. The predicate is only given when every clause parses: a
 * partial one would read as met while an unparsed clause may not be.
 */
export function readPrerequisites(prerequisites: RichText, names: PrerequisiteNames): PrerequisiteReading {
  const words = prerequisiteWords(prerequisites);
  if (words === undefined) {
    return { predicate: undefined, unparsed: [] };
  }
  const clauses = words
    .split(';')
    .map((clause) => normalise(clause))
    .filter((clause) => clause !== '');
  const read = clauses.map((clause) => ({ clause, statements: clauseStatements(clause, names) }));
  const unparsed = read.flatMap(({ clause, statements }) => (statements === undefined ? [clause] : []));
  const parsed = Predicate.safeParse(read.flatMap(({ statements }) => statements ?? []));
  return unparsed.length === 0 && parsed.success
    ? { predicate: parsed.data, unparsed }
    : { predicate: undefined, unparsed };
}

/** The predicate the matcher read for one feat. */
export interface PrerequisiteMatch {
  readonly entry: ContentKey;
  readonly prerequisitePredicate: Predicate;
}

/**
 * For each feat with prerequisites but no predicate, the predicate its text reads as. A feat that already has one
 * keeps it, so a hand correction is never overwritten.
 */
export function prerequisiteMatches(entries: readonly ContentEntry[]): readonly PrerequisiteMatch[] {
  const names = prerequisiteNames(entries);
  return entries.flatMap((entry) => {
    if (entry.kind !== ContentKind.Feat) {
      return [];
    }
    const { prerequisites, prerequisitePredicate } = entry.data;
    if (prerequisites === undefined || prerequisitePredicate !== undefined) {
      return [];
    }
    const { predicate } = readPrerequisites(prerequisites, names);
    return predicate === undefined
      ? []
      : [{ entry: contentKey(entry.pack, entry.slug), prerequisitePredicate: predicate }];
  });
}
