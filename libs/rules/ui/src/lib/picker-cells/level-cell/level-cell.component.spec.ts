import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { LevelCell } from './level-cell.component';

describe(LevelCell, () => {
  it('shows the number, read out as the level', async () => {
    const host = await renderCell(LevelCell, { level: 3 });
    expect(host.querySelector('[aria-hidden="true"]')?.textContent.trim()).toBe('3');
    expect(host.querySelector('.sr-only')?.textContent.trim()).toBe('Level 3');
  });

  it('shows nothing for a row with no level', async () => {
    const host = await renderCell(LevelCell, { level: undefined });
    expect(host.querySelector('fr-glyph')).toBeNull();
  });
});
