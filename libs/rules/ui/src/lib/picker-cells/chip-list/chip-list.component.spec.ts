import { BadgeTone } from '@pioneer/frontier';
import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { ChipList } from './chip-list.component';

describe(ChipList, () => {
  it('shows a chip per trait, in order', async () => {
    const host = await renderCell(ChipList, {
      chips: [{ label: 'Fire' }, { label: 'Rare trait', tone: BadgeTone.Info }],
    });
    const chips = [...host.querySelectorAll('fr-badge')].map((chip) => chip.textContent.trim());
    expect(chips).toStrictEqual(['Fire', 'Rare trait']);
  });

  it('shows nothing for no traits', async () => {
    const host = await renderCell(ChipList, { chips: [] });
    expect(host.querySelectorAll('fr-badge')).toHaveLength(0);
  });
});
