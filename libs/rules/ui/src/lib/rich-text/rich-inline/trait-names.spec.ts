import { RichTextString, Trait, traitId } from '@pioneer/rules/sdk';
import type { InlineContent } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { linkTraitNames } from './trait-names';

const ALWAYS = (): boolean => true;
const NEVER = (): boolean => false;

function words(text: string): InlineContent {
  return [{ type: 'text', text: RichTextString.parse(text) }];
}

/** The text of each piece, with a reference in square brackets. */
function shown(text: string, linkable: () => boolean = ALWAYS): string {
  return linkTraitNames(words(text), linkable)
    .map((node) => {
      if (node.type === 'ref') {
        return `[${node.label ?? ''}]`;
      }
      return node.type === 'text' ? node.text : '';
    })
    .join('');
}

describe(linkTraitNames, () => {
  it('links the trait named before the word trait, pointing at its entry', () => {
    const linked = linkTraitNames(words('An ability that has the incapacitation trait is weaker.'), ALWAYS);

    expect(linked[1]).toMatchObject({
      type: 'ref',
      id: traitId(Trait.parse('incapacitation')),
      label: 'incapacitation',
    });
    expect(shown('An ability that has the incapacitation trait is weaker.')).toBe(
      'An ability that has the [incapacitation] trait is weaker.',
    );
  });

  it('links each trait of a list before the word traits', () => {
    expect(shown('Spells with the manipulate and attack traits.')).toBe(
      'Spells with the [manipulate] and [attack] traits.',
    );
    expect(shown('Spells with the fire, cold, or acid traits.')).toBe(
      'Spells with the [fire], [cold], or [acid] traits.',
    );
  });

  it('keeps the case the text used in the label', () => {
    expect(shown('The Incapacitation trait applies.')).toBe('The [Incapacitation] trait applies.');
  });

  it.each(['the', 'this', 'that', 'the same', 'each', 'the following', 'its', 'another', 'any'])(
    'leaves "%s trait" as the words it is',
    (words_) => {
      expect(shown(`It gains ${words_} trait.`)).toBe(`It gains ${words_} trait.`);
    },
  );

  it.each(['fire', 'air', 'good', 'light', 'evil'])(
    'leaves a bare "%s" alone, as it is no trait without the word',
    (word) => {
      expect(shown(`The ${word} is bright, and a ${word} spell.`)).toBe(`The ${word} is bright, and a ${word} spell.`);
    },
  );

  it('leaves a list alone when one of its words names no trait', () => {
    expect(shown('Spells with the following, manipulate and attack traits.')).toBe(
      'Spells with the following, manipulate and attack traits.',
    );
  });

  it('leaves the text alone where the page cannot show the trait', () => {
    expect(linkTraitNames(words('the incapacitation trait'), NEVER)).toStrictEqual(words('the incapacitation trait'));
  });

  it('leaves a run with marks alone', () => {
    const marked: InlineContent = [
      { type: 'text', text: RichTextString.parse('incapacitation trait'), marks: ['strong'] },
    ];

    expect(linkTraitNames(marked, ALWAYS)).toStrictEqual(marked);
  });

  it('links a value trait written with its hyphens', () => {
    expect(shown('A weapon with the deadly-d8 trait.')).toBe('A weapon with the [deadly-d8] trait.');
  });
});
