import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { RankBadge } from './rank-badge.component';

describe(RankBadge, () => {
  it.each([
    [1, '1st rank'],
    [2, '2nd rank'],
    [3, '3rd rank'],
    [10, '10th rank'],
  ])('shows rank %s as "%s"', async (rank, text) => {
    const host = await renderCell(RankBadge, { rank });
    expect(host.textContent.trim()).toBe(text);
  });
});
