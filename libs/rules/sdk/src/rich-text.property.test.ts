import { describe, expect, test } from 'bun:test';

import { assert, property } from 'fast-check';
import { z } from 'zod';

import { RichText } from './rich-text';
import { richTextJson } from './testing';

describe('rich text (properties)', () => {
  test('valid documents parse to themselves and encode back unchanged', () => {
    assert(
      property(richTextJson, (json) => {
        const parsed: unknown = RichText.parse(json);
        expect(parsed).toStrictEqual(json);
        expect(z.encode(RichText, RichText.parse(json))).toStrictEqual(json);
      }),
    );
  });

  test('a node with a type the schema does not know is always rejected', () => {
    assert(
      property(richTextJson, (json) => {
        const withUnknown = [...(json as unknown[]), { type: 'html', html: '<b>x</b>' }];
        expect(RichText.safeParse(withUnknown).success).toBe(false);
      }),
    );
  });
});
