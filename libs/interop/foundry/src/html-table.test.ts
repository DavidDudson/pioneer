import { describe, expect, test } from 'bun:test';

import { htmlToRichText } from './html-rich-text';

function richTextOf(html: string): unknown {
  return htmlToRichText(html).richText;
}

function text(value: string): object {
  return { type: 'text', text: value };
}

function paragraph(...content: object[]): object {
  return { type: 'paragraph', content };
}

describe('htmlToRichText: captions with inline nodes', () => {
  test('keep them in a paragraph before the table', () => {
    expect(
      richTextOf(
        '<table><caption><span class="action-glyph">2</span> @Damage[2d6[fire]]</caption><tr><td>a</td></tr></table>',
      ),
    ).toEqual([
      paragraph({ type: 'action-cost', cost: 'two' }, text(' '), {
        type: 'damage',
        instances: [{ formula: '2d6', damageType: 'fire' }],
      }),
      { type: 'table', rows: [[[text('a')]]] },
    ]);
  });
});
