import { describe, expect, test } from 'bun:test';

import { RichText } from '@pioneer/rules/sdk';
import { array, assert, constant, constantFrom, letrec, oneof, property, string, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { htmlToRichText } from './html-rich-text';

/** Generated HTML from the subset `htmlToRichText` maps, and the text it holds. */
interface Html {
  readonly html: string;
  readonly text: string;
}

const NESTING_MAX = 3;
const CHILDREN_MAX = 4;
const TEXT_MAX = 30;
/** Letters, spaces, characters HTML escapes, a no-break space and non-ASCII. */
const UNITS = ['a', 'b', ' ', '&', '<', '>', '\n', '\t', '\u00A0', '\u2014', '\u00E9'];

const ENTITIES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

function escaped(text: string): string {
  return text.replaceAll(/[&<>]/gu, (character) => ENTITIES[character] ?? character);
}

const words: Arbitrary<Html> = string({ maxLength: TEXT_MAX, unit: constantFrom(...UNITS) }).map((text) => ({
  html: escaped(text),
  text,
}));

function concatenated(parts: readonly Html[]): Html {
  return { html: parts.map(({ html }) => html).join(''), text: parts.map(({ text }) => text).join('') };
}

function wrapped(tag: string, children: readonly Html[]): Html {
  const { html, text } = concatenated(children);
  return { html: `<${tag}>${html}</${tag}>`, text };
}

function list(tag: string, items: readonly (readonly Html[])[]): Html {
  return wrapped(
    tag,
    items.map((item) => wrapped('li', item)),
  );
}

function inline(depth: number): Arbitrary<Html> {
  if (depth >= NESTING_MAX) {
    return words;
  }
  const children = array(inline(depth + 1), { maxLength: CHILDREN_MAX });
  return oneof(
    words,
    constant({ html: '<br>', text: '' }),
    tuple(constantFrom('strong', 'b', 'em', 'i'), children).map(([tag, each]) => wrapped(tag, each)),
  );
}

const run = array(inline(0), { maxLength: CHILDREN_MAX });

function table(): Arbitrary<Html> {
  const cell = tuple(constantFrom('td', 'th'), run).map(([tag, each]) => wrapped(tag, each));
  const row = array(cell, { maxLength: CHILDREN_MAX }).map((cells) => wrapped('tr', cells));
  const group = tuple(constantFrom('thead', 'tbody'), array(row, { maxLength: CHILDREN_MAX })).map(([tag, rows]) =>
    wrapped(tag, rows),
  );
  return array(oneof(row, group), { maxLength: CHILDREN_MAX }).map((parts) => wrapped('table', parts));
}

function lists(items: Arbitrary<Html[]>): Arbitrary<Html> {
  const tags = constantFrom('ul', 'ol');
  return tuple(tags, array(items, { maxLength: CHILDREN_MAX })).map(([tag, each]) => list(tag, each));
}

const { blocks } = letrec<{ blocks: Html[]; block: Html }>((tie) => ({
  blocks: array(tie('block'), { maxLength: CHILDREN_MAX, depthIdentifier: 'blocks' }),
  block: oneof(
    { depthSize: 'small', withCrossShrink: true },
    run.map((each) => wrapped('p', each)),
    tuple(constantFrom('h1', 'h2', 'h3', 'h4'), run).map(([tag, each]) => wrapped(tag, each)),
    constant({ html: '<hr />', text: '' }),
    inline(0),
    table(),
    lists(tie('blocks')),
  ),
}));

const html = blocks.map((parts) => concatenated(parts));

function textOf(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((each) => textOf(each)).join('');
  }
  if (typeof value !== 'object' || value === null) {
    return '';
  }
  return Object.entries(value)
    .map(([key, field]) => (key === 'text' || key === 'caption' ? String(field) : textOf(field)))
    .join('');
}

function withoutSpace(text: string): string {
  return text.replaceAll(/\s+/gu, '');
}

describe('htmlToRichText', () => {
  test('HTML from the supported subset parses as RichText, keeps all its text and reports nothing', () => {
    assert(
      property(html, ({ html: markup, text }) => {
        const { richText, unknownMarkup } = htmlToRichText(markup);

        expect(RichText.safeParse(richText).success).toBe(true);
        expect(withoutSpace(textOf(richText))).toBe(withoutSpace(text));
        expect(unknownMarkup).toEqual([]);
      }),
    );
  });

  test('never throws, and always parses as RichText, on arbitrary text', () => {
    assert(
      property(string(), (markup) => {
        expect(RichText.safeParse(htmlToRichText(markup).richText).success).toBe(true);
      }),
    );
  });
});
