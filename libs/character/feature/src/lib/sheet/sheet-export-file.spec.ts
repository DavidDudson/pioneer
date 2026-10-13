import { describe, expect, it } from 'vitest';

import { exportFileName } from './sheet-export-file';

describe('the export file name', () => {
  it('joins the lower-cased words of the name with hyphens', () => {
    expect(exportFileName('Merisiel Silverleaf')).toBe('merisiel-silverleaf.pioneer.json');
  });

  it('drops punctuation and keeps letters from any script', () => {
    expect(exportFileName("Zoë  O'Neil!")).toBe('zoë-o-neil.pioneer.json');
  });

  it('falls back when the name has no words', () => {
    expect(exportFileName('?!')).toBe('character.pioneer.json');
  });

  it('cuts a very long name', () => {
    expect(exportFileName('a'.repeat(200))).toBe(`${'a'.repeat(60)}.pioneer.json`);
  });
});
