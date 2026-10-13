import { describe, expect, it } from 'vitest';

import { proseToRichText, richTextToProse } from './sheet-prose';

describe(proseToRichText, () => {
  it('makes nothing of empty text, so a field can be cleared', () => {
    expect(proseToRichText('')).toStrictEqual([]);
    expect(proseToRichText('  \n ')).toStrictEqual([]);
  });

  it('makes a paragraph per blank-line-separated run and a line break per newline', () => {
    expect(proseToRichText('Tall.\nScarred.\n\nSmiles rarely.')).toStrictEqual([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Tall.' }, { type: 'line-break' }, { type: 'text', text: 'Scarred.' }],
      },
      { type: 'paragraph', content: [{ type: 'text', text: 'Smiles rarely.' }] },
    ]);
  });

  it('reads Windows line endings as newlines', () => {
    expect(proseToRichText('One.\r\n\r\nTwo.')).toHaveLength(2);
  });

  it('treats any run of blank lines as one paragraph break', () => {
    expect(proseToRichText('a\n\n\n\nb')).toHaveLength(2);
  });
});

describe(richTextToProse, () => {
  it('is the inverse of proseToRichText', () => {
    const text = 'A scar over the left eye.\nAlways cold.\n\nHums while working.';
    expect(richTextToProse(proseToRichText(text))).toBe(text);
  });

  it('reads no rich text as empty', () => {
    expect(richTextToProse([])).toBe('');
  });
});
