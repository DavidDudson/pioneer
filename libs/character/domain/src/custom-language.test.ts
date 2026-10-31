import { describe, expect, test } from 'bun:test';

import { CharacterPatchField } from './character-patch';
import { CUSTOM_LANGUAGES_MAX, customLanguagesOf, LanguageName } from './custom-language';
import { CharacterBuilder } from './testing/character-builder';
import { dismissedPick } from './unplaced-picks';

/** The brand of each name, to compare with what `customLanguagesOf` returns. */
function named(...values: readonly string[]): LanguageName[] {
  return values.map((value) => LanguageName.parse(value));
}

describe('customLanguagesOf', () => {
  test('keeps each language once whatever its case, with the first spelling', () => {
    expect(customLanguagesOf(['Wildsong', 'wildsong', 'Klingon', 'WILDSONG'])).toStrictEqual(
      named('Wildsong', 'Klingon'),
    );
  });

  test('trims a name and leaves out one that is empty or too long', () => {
    expect(customLanguagesOf(['  Wildsong ', '   ', 'x'.repeat(81)])).toStrictEqual(named('Wildsong'));
  });

  test('keeps at most the limit', () => {
    const names = Array.from({ length: CUSTOM_LANGUAGES_MAX + 5 }, (_value, index) => `Tongue ${index}`);
    expect(customLanguagesOf(names)).toHaveLength(CUSTOM_LANGUAGES_MAX);
  });
});

describe('removing a custom language', () => {
  test('takes the named language off the build and leaves the others', () => {
    const { build } = new CharacterBuilder().build().document;
    const withNames = { ...build, customLanguages: customLanguagesOf(['Wildsong', 'Klingon']) };
    const removed = dismissedPick(withNames, {
      field: CharacterPatchField.RemoveCustomLanguage,
      language: LanguageName.parse('Wildsong'),
    });
    expect(removed.customLanguages).toStrictEqual(named('Klingon'));
  });
});
