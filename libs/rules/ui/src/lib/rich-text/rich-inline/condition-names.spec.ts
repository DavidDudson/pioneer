import { RichTextString } from '@pioneer/rules/sdk';
import type { InlineContent } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { linkConditionNames } from './condition-names';

const ALWAYS = (): boolean => true;
const NEVER = (): boolean => false;
const BLINDED = 'The target is blinded.';
const PLAIN_RUN: InlineContent = [{ type: 'text', text: RichTextString.parse('blinded'), marks: ['strong'] }];

function words(text: string): InlineContent {
  return [{ type: 'text', text: RichTextString.parse(text) }];
}

function kindsOf(text: string, linkable: () => boolean): readonly string[] {
  const linked = linkConditionNames(words(text), linkable);
  return linked.map(({ type }) => type);
}

describe(linkConditionNames, () => {
  it('links a valued condition named with its value, keeping the value in the label', () => {
    const linked = linkConditionNames(words('You are frightened 2 until rest.'), ALWAYS);

    expect(linked[1]).toMatchObject({ type: 'ref', label: 'frightened 2' });
  });

  it('keeps the text around a mention', () => {
    expect(kindsOf('You are frightened 2 until rest.', ALWAYS)).toStrictEqual(['text', 'ref', 'text']);
  });

  it('links an unvalued condition by its name', () => {
    expect(kindsOf(BLINDED, ALWAYS)).toStrictEqual(['text', 'ref', 'text']);
  });

  it('leaves a valued condition named without a value as the word it is', () => {
    expect(kindsOf('The spell drained your energy.', ALWAYS)).toStrictEqual(['text']);
  });

  it('points every mention of a condition at the same id, whatever its case', () => {
    const [, lower] = linkConditionNames(words(BLINDED), ALWAYS);
    const [, upper] = linkConditionNames(words('The target is Blinded.'), ALWAYS);

    expect(lower).toMatchObject({ id: (upper as { id: string }).id });
  });

  it('leaves the text alone where the page cannot show the condition', () => {
    expect(kindsOf('Blinded', NEVER)).toStrictEqual(['text']);
  });

  it('leaves a run with marks as it is', () => {
    expect(linkConditionNames(PLAIN_RUN, ALWAYS)).toStrictEqual(PLAIN_RUN);
  });
});
