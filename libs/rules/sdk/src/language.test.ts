import { describe, expect, it } from 'vitest';

import { LanguageData, LanguageScript } from './language';

describe('LanguageData', () => {
  it('takes a language with no script', () => {
    expect(LanguageData.parse({})).toStrictEqual({});
  });

  it('takes the script a language is written in', () => {
    expect(LanguageData.parse({ script: 'Iokharic' })).toStrictEqual({ script: LanguageScript.parse('Iokharic') });
  });

  it('rejects an empty script', () => {
    expect(LanguageData.safeParse({ script: '' }).success).toBe(false);
  });
});
