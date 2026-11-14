import { InlineKind, InlineLabel, RichTextString, Trait, traitId } from '@pioneer/rules/sdk';
import type { ContentId, InlineContent } from '@pioneer/rules/sdk';

/** The word straight before "trait" or "traits" ("the incapacitation trait"). Only that position names a trait. */
const LAST_NAME = /\b(?<name>[a-z][a-z0-9-]*)(?=\s+traits?\b)/giu;

/** A name and the comma, "and" or "or" after it, at the end of the text before a name: the earlier names of a list. */
const EARLIER_NAME = /\b(?<name>[a-z][a-z0-9-]*)(?:,\s(?:(?:and|or)\s)?|\s(?:and|or)\s)$/iu;

/** Words that stand before "trait" without naming one: "the same trait", "this trait", "the following traits". */
const NOT_NAMES: ReadonlySet<string> = new Set([
  'a',
  'an',
  'another',
  'any',
  'appropriate',
  'associated',
  'chosen',
  'corresponding',
  'different',
  'each',
  'every',
  'following',
  'given',
  'its',
  'listed',
  'matching',
  'new',
  'no',
  'one',
  'other',
  'relevant',
  'same',
  'selected',
  'such',
  'that',
  'the',
  'their',
  'these',
  'this',
  'those',
  'which',
  'your',
]);

/** A name in a run of text, and where it starts. */
interface Mention {
  readonly name: string;
  readonly at: number;
}

/** A mention that names a trait the page can show. */
interface Linked extends Mention {
  readonly id: ContentId;
}

/** The names of the list that ends with the name `last`, in order, or none when a word of it names no trait. */
function listEndingAt(run: string, last: Mention): readonly Mention[] {
  const names: Mention[] = [last];
  let earlier = EARLIER_NAME.exec(run.slice(0, last.at));
  while (earlier !== null) {
    const name = earlier.groups?.['name'] ?? '';
    names.unshift({ name, at: earlier.index });
    earlier = EARLIER_NAME.exec(run.slice(0, earlier.index));
  }
  return names.some((each) => NOT_NAMES.has(each.name.toLowerCase())) ? [] : names;
}

/** Every trait `run` names before the word trait, in order. */
function mentions(run: string): readonly Mention[] {
  const lasts = [...run.matchAll(LAST_NAME)].map((match): Mention => ({
    name: match.groups?.['name'] ?? '',
    at: match.index,
  }));
  const found = lasts.flatMap((last) => listEndingAt(run, last));
  const unique = new Map(found.map((each): [number, Mention] => [each.at, each]));
  return [...unique.values()].toSorted((left, right) => left.at - right.at);
}

/** The id of the trait a name names, whatever its case; none for a word that is not a slug ("fire-", "a--b"). */
function idOf(name: string): ContentId | undefined {
  const trait = Trait.safeParse(name.toLowerCase());
  return trait.success ? traitId(trait.data) : undefined;
}

function plain(value: string): InlineContent {
  return value === '' ? [] : [{ type: InlineKind.Text, text: RichTextString.parse(value) }];
}

/**
 * `content` with the traits named in plain text before the word "trait" ("has the incapacitation trait", "with the
 * manipulate and attack traits") turned into references to them, so they open the trait's card as a link the content
 * made does. A run with marks, and anything that already is a reference, stays as it is. A name is linked only when
 * `linkable` says the page can show the trait.
 */
export function linkTraitNames(content: InlineContent, linkable: (id: ContentId) => boolean): InlineContent {
  return content.flatMap((node): InlineContent => {
    if (node.type !== 'text' || node.marks !== undefined) {
      return [node];
    }
    const linked = mentions(node.text).flatMap((each): readonly Linked[] => {
      const id = idOf(each.name);
      return id !== undefined && linkable(id) ? [{ ...each, id }] : [];
    });
    if (linked.length === 0) {
      return [node];
    }
    const out: InlineContent[number][] = [];
    let cursor = 0;
    for (const { name, at, id } of linked) {
      const ref = { type: InlineKind.Ref, id, label: InlineLabel.parse(name) } as const;
      out.push(...plain(node.text.slice(cursor, at)), ref);
      cursor = at + name.length;
    }
    return [...out, ...plain(node.text.slice(cursor))];
  });
}
