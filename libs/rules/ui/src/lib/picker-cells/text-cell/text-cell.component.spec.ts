import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { TextCell } from './text-cell.component';

describe(TextCell, () => {
  it('shows the text', async () => {
    const host = await renderCell(TextCell, { text: '12' });
    expect(host.textContent.trim()).toBe('12');
  });
});
