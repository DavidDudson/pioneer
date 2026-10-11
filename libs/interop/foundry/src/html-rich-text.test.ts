import { describe, expect, test } from 'bun:test';

import { RichText } from '@pioneer/rules/sdk';

import { htmlToRichText, OVERSIZED_MARKUP } from './html-rich-text';

function richTextOf(html: string): unknown {
  return htmlToRichText(html).richText;
}

function text(value: string, marks?: readonly string[]): object {
  return marks === undefined ? { type: 'text', text: value } : { type: 'text', text: value, marks };
}

/** The text of every text node, in order. */
function textsOf(richText: RichText): string[] {
  return richText.flatMap((block) =>
    block.type === 'paragraph' ? block.content.flatMap((node) => (node.type === 'text' ? [node.text] : [])) : [],
  );
}

function paragraph(...content: object[]): object {
  return { type: 'paragraph', content };
}

describe('htmlToRichText: blocks', () => {
  test('a paragraph per <p>', () => {
    expect(richTextOf('<p>One.</p><p>Two.</p>')).toEqual([paragraph(text('One.')), paragraph(text('Two.'))]);
  });

  test('text outside any block is a paragraph of its own', () => {
    expect(richTextOf('Loose <em>words</em><hr />After')).toEqual([
      paragraph(text('Loose '), text('words', ['emphasis'])),
      { type: 'rule' },
      paragraph(text('After')),
    ]);
  });

  test('<h1> to <h3> keep their level and deeper headings clamp to 3', () => {
    expect(richTextOf('<h1>A</h1><h2>B</h2><h3>C</h3><h4>D</h4><h6>E</h6>')).toEqual(
      [1, 2, 3, 3, 3].map((level, index) => ({ type: 'heading', level, content: [text('ABCDE'.charAt(index))] })),
    );
  });

  test('<hr> is a rule', () => {
    expect(richTextOf('<p>Cast.</p><hr /><p><strong>Heightened (+1)</strong> More.</p>')).toEqual([
      paragraph(text('Cast.')),
      { type: 'rule' },
      paragraph(text('Heightened (+1)', ['strong']), text(' More.')),
    ]);
  });

  test('a <ul> or <ol> is a list, each <li> a run of blocks, nested lists included', () => {
    expect(richTextOf('<ul><li>One</li><li><p>Two</p><ol><li>Deep</li></ol></li></ul>')).toEqual([
      {
        type: 'list',
        ordered: false,
        items: [
          [paragraph(text('One'))],
          [paragraph(text('Two')), { type: 'list', ordered: true, items: [[paragraph(text('Deep'))]] }],
        ],
      },
    ]);
  });

  test('a list inside a paragraph closes it', () => {
    expect(richTextOf('<p>Pick one:<ul><li>A</li></ul></p>')).toEqual([
      paragraph(text('Pick one:')),
      { type: 'list', ordered: false, items: [[paragraph(text('A'))]] },
    ]);
  });
});

describe('htmlToRichText: tables', () => {
  test('<thead> is the header and <tbody> rows follow', () => {
    const html =
      '<table><thead><tr><th>Level</th><th>Cost</th></tr></thead>' +
      '<tbody><tr><td>1</td><td><strong>60</strong> gp</td></tr></tbody></table>';

    expect(richTextOf(html)).toEqual([
      {
        type: 'table',
        header: [[text('Level')], [text('Cost')]],
        rows: [[[text('1')], [text('60', ['strong']), text(' gp')]]],
      },
    ]);
  });

  test('a first row of only <th> is the header; rows without a group are read too', () => {
    expect(richTextOf('<table><tr><th>A</th></tr><tr><td>1</td></tr></table>')).toEqual([
      { type: 'table', header: [[text('A')]], rows: [[[text('1')]]] },
    ]);
  });

  test('rows keep document order across row groups and bare rows', () => {
    expect(richTextOf('<table><tbody><tr><td>1</td></tr></tbody><tr><td>2</td></tr></table>')).toEqual([
      { type: 'table', rows: [[[text('1')]], [[text('2')]]] },
    ]);
  });

  test('a table of one heading row keeps it as a row', () => {
    expect(richTextOf('<table><thead><tr><th>Only</th></tr></thead></table>')).toEqual([
      { type: 'table', rows: [[[text('Only')]]] },
    ]);
  });

  test('a caption is the label, and empty cells are kept', () => {
    expect(richTextOf('<table><caption>Costs</caption><tr><td></td><td>x</td></tr></table>')).toEqual([
      { type: 'table', caption: 'Costs', rows: [[[], [text('x')]]] },
    ]);
  });

  test('blocks inside a cell become lines', () => {
    expect(richTextOf('<table><tr><td><p>One</p><p>Two</p></td></tr></table>')).toEqual([
      { type: 'table', rows: [[[text('One'), { type: 'line-break' }, text('Two')]]] },
    ]);
  });

  test('tfoot rows follow the body', () => {
    expect(
      richTextOf('<table><tfoot><tr><td>Total</td></tr></tfoot><tbody><tr><td>1</td></tr></tbody></table>'),
    ).toEqual([{ type: 'table', rows: [[[text('Total')]], [[text('1')]]] }]);
  });

  test('several captions are one label, and a caption too long for a label is a paragraph before the table', () => {
    const long = 'c'.repeat(250);

    expect(richTextOf('<table><caption>A</caption><caption>B</caption><tr><td>1</td></tr></table>')).toEqual([
      { type: 'table', caption: 'A B', rows: [[[text('1')]]] },
    ]);
    expect(richTextOf(`<table><caption>${long}</caption><tr><td>1</td></tr></table>`)).toEqual([
      paragraph(text(long)),
      { type: 'table', rows: [[[text('1')]]] },
    ]);
  });

  test('a table with no rows is dropped', () => {
    expect(richTextOf('<table></table>')).toEqual([]);
  });
});

describe('htmlToRichText: inline', () => {
  test('<strong>, <b>, <em> and <i> are marks, nested marks combine in a fixed order', () => {
    expect(richTextOf('<p><b>B</b><i>I</i><em><strong>Both</strong></em></p>')).toEqual([
      paragraph(text('B', ['strong']), text('I', ['emphasis']), text('Both', ['emphasis', 'strong'])),
    ]);
  });

  test('<br> is a line break, trimmed at the edges of a run', () => {
    expect(richTextOf('<p><br>Line one <br/> line two<br></p>')).toEqual([
      paragraph(text('Line one'), { type: 'line-break' }, text('line two')),
    ]);
  });

  test('adjacent text with the same marks merges', () => {
    expect(richTextOf('<p><strong>A</strong><strong>B</strong></p>')).toEqual([paragraph(text('AB', ['strong']))]);
  });

  test('entities are decoded', () => {
    expect(richTextOf('<p>Fish &amp; chips&nbsp;&lt;3 &#8212;</p>')).toEqual([paragraph(text('Fish & chips <3 —'))]);
  });

  test('action glyph spans are action costs, unreported; a glyph showing anything else stays text', () => {
    const html = '<p>Stride <span class="action-glyph">2</span> or <span class="action-glyph">1 – 3</span></p>';
    const { unknownMarkup } = htmlToRichText(html);

    expect(richTextOf(html)).toEqual([
      paragraph(text('Stride '), { type: 'action-cost', cost: 'two' }, text(' or 1 – 3')),
    ]);
    expect(unknownMarkup).toEqual(['span[class]', 'span']);
  });

  test('enrichers become inline nodes, with what does not translate reported', () => {
    const html =
      '<p><em>@Check[reflex|basic]</em> or see @UUID[Compendium.pf2e.journals.JournalEntry.x]{the rules}</p>';
    const { untranslatedEnrichers } = htmlToRichText(html);

    expect(richTextOf(html)).toEqual([
      paragraph({ type: 'check', statistic: 'save:reflex', basic: true }, text(' or see the rules')),
    ]);
    expect(untranslatedEnrichers).toEqual(['@UUID[journals]']);
  });
});

describe('htmlToRichText: whitespace', () => {
  test('runs collapse to one space and trim at block edges', () => {
    expect(richTextOf('<p>\n  Spread \t over\n lines  </p>')).toEqual([paragraph(text('Spread over lines'))]);
  });

  test('a space between marks is kept once', () => {
    expect(richTextOf('<p><strong>Trigger </strong> <em> You</em></p>')).toEqual([
      paragraph(text('Trigger ', ['strong']), text('You', ['emphasis'])),
    ]);
  });

  test('whitespace-only marks at an edge leave no space behind', () => {
    expect(richTextOf('<p> <strong> </strong>x <em> </em></p>')).toEqual([paragraph(text('x'))]);
  });

  test('empty paragraphs and whitespace between blocks are dropped', () => {
    expect(richTextOf('<p></p>\n<p> &nbsp; </p>\n<p>Kept</p>\n')).toEqual([paragraph(text('Kept'))]);
  });

  test('a list item or cell out of place is a block of its own', () => {
    expect(richTextOf('<li>one</li><li>two</li><td>three</td>')).toEqual([
      paragraph(text('one')),
      paragraph(text('two')),
      paragraph(text('three')),
    ]);
  });

  test('long text splits between characters, never inside a surrogate pair', () => {
    const start = 'a'.repeat(3999);
    const html = `<p>${start}\u{1F600}b</p>`;

    expect(richTextOf(html)).toEqual([paragraph(text(start), text('\u{1F600}b'))]);
  });

  test('a single character longer than a text node is split by code point', () => {
    const combined = `a${'\u0301'.repeat(4100)}`;
    const texts = textsOf(htmlToRichText(`<p>${combined}</p>`).richText);

    expect(texts.join('')).toBe(combined);
    expect(texts.every((each) => each.length <= 4000)).toBe(true);
  });

  test('text longer than a rich text string is split', () => {
    const long = 'a'.repeat(4500);
    const first = text('a'.repeat(4000));
    const rest = text('a'.repeat(500));

    expect(richTextOf(`<p>${long}</p>`)).toEqual([paragraph(first, rest)]);
  });
});

describe('htmlToRichText: unknown markup', () => {
  test('an unknown element is reported once and its text kept in place', () => {
    const { richText, unknownMarkup } = htmlToRichText(
      '<p>Stride <span>1</span> or <span>2</span></p><section><h2>Tasks</h2></section>',
    );
    const converted: unknown = richText;

    expect(converted).toEqual([
      paragraph(text('Stride 1 or 2')),
      { type: 'heading', level: 2, content: [text('Tasks')] },
    ]);
    expect(unknownMarkup).toEqual(['span', 'section']);
  });

  test('every attribute is reported by element and name', () => {
    const html =
      '<table class="pf2e"><tbody><tr style="x"><td rowspan="2">1</td></tr></tbody></table><p title="t">x</p>';

    expect(htmlToRichText(html).unknownMarkup).toEqual(['table[class]', 'tr[style]', 'td[rowspan]', 'p[title]']);
  });

  test('a description past the rich text bounds is flattened to paragraphs and reported', () => {
    const nested = `<p>Top</p>${'<ul><li>'.repeat(12)}deep${'</li></ul>'.repeat(12)}`;
    const { richText, unknownMarkup } = htmlToRichText(nested);
    const flat: unknown = richText;

    expect(flat).toEqual([paragraph(text('Top')), paragraph(text('deep'))]);
    expect(unknownMarkup).toEqual([OVERSIZED_MARKUP]);
  });

  test('markup nested past the depth limit keeps its text flat, without exhausting the stack', () => {
    const deep = `<p>${'<b>'.repeat(20_000)}x</p>`;
    const { richText, unknownMarkup } = htmlToRichText(deep);

    expect(RichText.safeParse(richText).success).toBe(true);
    expect(JSON.stringify(richText)).toContain('"x"');
    expect(unknownMarkup).toEqual([OVERSIZED_MARKUP]);
  });

  test('script, style and the like are reported and dropped with their content', () => {
    const { richText, unknownMarkup } = htmlToRichText('<p>Kept<style>.x{}</style><script>run()</script></p>');
    const kept: unknown = richText;

    expect(kept).toEqual([paragraph(text('Kept'))]);
    expect(unknownMarkup).toEqual(['style', 'script']);
  });

  test('content a table has no place for is reported and follows it as blocks', () => {
    const html = '<table><colgroup><col span="2"></colgroup><tr><td>1</td>stray</tr>loose<div>d</div></table>';
    const { richText, unknownMarkup } = htmlToRichText(html);
    const converted: unknown = richText;

    expect(converted).toEqual([
      { type: 'table', rows: [[[text('1')]]] },
      paragraph(text('loose')),
      paragraph(text('d')),
      paragraph(text('stray')),
    ]);
    expect(unknownMarkup).toEqual(['colgroup', 'col[span]', 'col', 'div']);
  });

  test('an empty description is empty rich text', () => {
    expect(RichText.parse(richTextOf(''))).toEqual([]);
  });
});
