import { describe, expect, test } from 'bun:test';

import { RichText } from '@pioneer/rules/sdk';

import { htmlToRichText, OVERSIZED_MARKUP } from './html-rich-text';

function richTextOf(html: string): unknown {
  return htmlToRichText(html).richText;
}

function text(value: string, marks?: readonly string[]): object {
  return marks === undefined ? { type: 'text', text: value } : { type: 'text', text: value, marks };
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

  test('enrichers stay text for the enricher story', () => {
    expect(richTextOf('<p>@UUID[Compendium.pf2e.conditionitems.Item.Off-Guard]</p>')).toEqual([
      paragraph(text('@UUID[Compendium.pf2e.conditionitems.Item.Off-Guard]')),
    ]);
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

  test('a description past the rich text bounds is dropped and reported', () => {
    const nested = `${'<ul><li>'.repeat(12)}deep${'</li></ul>'.repeat(12)}`;
    const { richText, unknownMarkup } = htmlToRichText(nested);

    expect(richText).toEqual([]);
    expect(unknownMarkup).toEqual([OVERSIZED_MARKUP]);
  });

  test('an empty description is empty rich text', () => {
    expect(RichText.parse(richTextOf(''))).toEqual([]);
  });
});
