import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { PrerequisiteList } from './prerequisite-list.component';

describe(PrerequisiteList, () => {
  it('reads each prerequisite out as met or not met', async () => {
    const host = await renderCell(PrerequisiteList, {
      prerequisites: [
        { label: 'Trained in Athletics', met: true },
        { label: 'Strength 16', met: false },
      ],
    });
    const spoken = [...host.querySelectorAll('.sr-only')].map((line) => line.textContent.trim());
    expect(spoken).toStrictEqual(['Met: Trained in Athletics', 'Not met: Strength 16']);
  });

  it('shows a dash when there are none', async () => {
    const host = await renderCell(PrerequisiteList, { prerequisites: [] });
    expect(host.textContent.trim()).toBe('—');
  });
});
