import { describe, expect, test } from 'bun:test';

import { InlineKind, RichTextString } from '@pioneer/rules/sdk';
import type { CheckOutcomes } from '@pioneer/rules/sdk';

import { htmlToRichText } from './html-rich-text';

/** The outcomes of the first check in the text, unset when it has none. */
function outcomesOf(html: string): CheckOutcomes | undefined {
  const [first] = htmlToRichText(html).richText;
  const checks = first?.type === 'paragraph' ? first.content.filter((node) => node.type === InlineKind.Check) : [];
  return checks[0]?.outcomes;
}

/** The degrees the first check in the text has outcomes for, sorted. */
function degreesOf(html: string): string[] {
  return Object.keys(outcomesOf(html) ?? {}).toSorted();
}

const DEGREES =
  '<p><strong>Critical Success</strong> You are unaffected.</p>' +
  '<p><strong>Success</strong> You are @UUID[Compendium.pf2e.conditionitems.Item.x]{Frightened} 1.</p>' +
  '<hr /><p><strong>Failure</strong> You flee.</p>' +
  '<p><strong>Critical Failure</strong> You are paralysed.</p>';

describe('check outcomes', () => {
  test('the degree paragraphs after a check become its outcomes', () => {
    const html = `<p>@Check[will|dc:20]</p>${DEGREES}`;
    expect(degreesOf(html)).toEqual(['criticalFailure', 'criticalSuccess', 'failure', 'success']);
    expect(outcomesOf(html)?.criticalSuccess).toEqual([
      { type: 'text', text: RichTextString.parse('You are unaffected.') },
    ]);
  });

  test('the degree paragraphs stay in the text', () => {
    expect(htmlToRichText(`<p>@Check[will|dc:20]</p>${DEGREES}`).richText).toHaveLength(6);
  });

  test('only the degrees the text names are kept', () => {
    const html = '<p>@Check[athletics|dc:15]</p><p><strong>Success</strong> You climb.</p>';
    expect(degreesOf(html)).toEqual(['success']);
  });

  test('a basic check keeps no outcomes', () => {
    expect(outcomesOf(`<p>@Check[reflex|basic|dc:20]</p>${DEGREES}`)).toBeUndefined();
  });

  test('a check with no degree paragraphs after it has none', () => {
    expect(outcomesOf('<p>@Check[will|dc:20]</p><p>Plain text.</p>')).toBeUndefined();
  });
});
