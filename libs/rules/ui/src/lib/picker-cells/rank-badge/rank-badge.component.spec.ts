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

  it.each([
    [{ rank: 1, cantrip: true }, 'Cantrip'],
    [{ rank: 1, cantrip: true, heightenedTo: 4 }, 'Cantrip, heightened to 4th'],
    [{ rank: 1, heightenedTo: 3 }, '1st rank, heightened to 3rd'],
    [{ rank: 3, heightenedTo: 3 }, '3rd rank'],
  ])('shows %j as "%s"', async (inputs, text) => {
    const host = await renderCell(RankBadge, inputs);
    expect(host.textContent.trim()).toBe(text);
  });
});
