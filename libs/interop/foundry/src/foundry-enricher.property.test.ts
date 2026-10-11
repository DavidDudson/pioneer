import { describe, expect, test } from 'bun:test';

import { array, assert, constantFrom, oneof, property, string, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { EnricherForm, enricherParts } from './foundry-enricher';
import type { EnricherPart } from './foundry-enricher';

/** Text and well-formed enrichers in reading order, and the parts `enricherParts` should find in them. */
interface Source {
  readonly text: string;
  readonly parts: readonly EnricherPart[];
}

const PART_MAX = 6;
const TEXT_MAX = 20;
/** Plain text: with no `[` or capital letter it opens no enricher, and with no `{` it is never read as a label. */
const PLAIN = ['a', 'b', ' ', '.', '@', '/', ']', '}'];
/** Everything enricher syntax is made of, for arbitrary input. */
const SYNTAX = ['@', 'U', 'Check', '[', ']', '[[', ']]', '/', 'r', '{', '}', ' ', 'a', '|', ':'];

const syntax: Arbitrary<string> = string({ unit: constantFrom(...SYNTAX) });
const plain: Arbitrary<string> = string({ maxLength: TEXT_MAX, unit: constantFrom(...PLAIN) });

const params: Arbitrary<string> = constantFrom('reflex|basic', '2d6[fire],1d6[persistent,fire]', 'a.b.c', '');
const label: Arbitrary<string | undefined> = oneof(constantFrom(undefined), constantFrom('Label', '', 'x y'));

const named: Arbitrary<Source> = tuple(constantFrom('UUID', 'Check', 'Damage', 'Template'), params, label).map(
  ([name, inner, text]) => ({
    text: `@${name}[${inner}]${text === undefined ? '' : `{${text}}`}`,
    parts: [{ form: EnricherForm.Named, name, params: inner, label: text }],
  }),
);

const command: Arbitrary<Source> = tuple(
  constantFrom('r', 'gmr', 'act'),
  constantFrom('1d4 #rounds', '2d6[fire]', 'trip'),
  label,
).map(([name, args, text]) => ({
  text: `[[/${name} ${args}]]${text === undefined ? '' : `{${text}}`}`,
  parts: [{ form: EnricherForm.Command, command: name, args, label: text }],
}));

const words: Arbitrary<Source> = plain.map((text) => ({ text, parts: text === '' ? [] : [text] }));

/** Adjacent text parts as one, as `enricherParts` returns them. */
function mergedText(parts: readonly EnricherPart[]): EnricherPart[] {
  const out: EnricherPart[] = [];
  for (const part of parts) {
    const last = out.at(-1);
    if (typeof part === 'string' && typeof last === 'string') {
      out[out.length - 1] = `${last}${part}`;
    } else {
      out.push(part);
    }
  }
  return out;
}

const sources: Arbitrary<Source> = array(oneof(words, named, command), { maxLength: PART_MAX }).map((pieces) => ({
  text: pieces.map(({ text }) => text).join(''),
  parts: mergedText(pieces.flatMap(({ parts }) => parts)),
}));

describe('enricherParts: properties', () => {
  test('finds every well-formed enricher between plain text, in order', () => {
    assert(
      property(sources, ({ text, parts }) => {
        const found: unknown = enricherParts(text);

        expect(found).toEqual(parts);
      }),
    );
  });

  test('never throws, and plain text comes back whole', () => {
    assert(
      property(syntax, (text) => {
        const parts = enricherParts(text);
        const texts = parts.filter((part) => typeof part === 'string');
        const found = texts.length < parts.length;

        expect(found || texts.join('') === text).toBe(true);
      }),
    );
  });
});
