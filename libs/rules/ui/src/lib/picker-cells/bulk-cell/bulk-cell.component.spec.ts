import { Bulk, BulkWeight } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { BulkCell } from './bulk-cell.component';

describe(BulkCell, () => {
  it.each([
    [Bulk.parse(2), '2'],
    [BulkWeight.Light, 'L'],
    [BulkWeight.Negligible, '—'],
    [undefined, '—'],
  ])('shows %s as "%s"', async (bulk, text) => {
    const host = await renderCell(BulkCell, { bulk });
    expect(host.textContent.trim()).toBe(text);
  });
});
