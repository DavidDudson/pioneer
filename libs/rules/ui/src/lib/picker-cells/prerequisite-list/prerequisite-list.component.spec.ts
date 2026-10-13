import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { PrerequisiteList, PrerequisiteState } from './prerequisite-list.component';

describe(PrerequisiteList, () => {
  it('reads each prerequisite out as met or not met', async () => {
    const host = await renderCell(PrerequisiteList, {
      prerequisites: [
        { label: 'Trained in Athletics', state: PrerequisiteState.Met },
        { label: 'Strength 16', state: PrerequisiteState.Unmet },
      ],
    });
    const spoken = [...host.querySelectorAll('.sr-only')].map((line) => line.textContent.trim());
    expect(spoken).toStrictEqual(['Met: Trained in Athletics', 'Not met: Strength 16']);
  });

  it('reads a prerequisite that cannot be checked as such, never as not met', async () => {
    const host = await renderCell(PrerequisiteList, {
      prerequisites: [{ label: 'Worships a deity of magic', state: PrerequisiteState.Unknown }],
    });
    const spoken = [...host.querySelectorAll('.sr-only')].map((line) => line.textContent.trim());
    expect(spoken).toStrictEqual(["Can't be checked: Worships a deity of magic"]);
  });

  it('shows a dash when there are none', async () => {
    const host = await renderCell(PrerequisiteList, { prerequisites: [] });
    expect(host.textContent.trim()).toBe('—');
  });
});
