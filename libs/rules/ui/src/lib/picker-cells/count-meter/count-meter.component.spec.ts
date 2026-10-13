import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { CountMeter } from './count-meter.component';

describe(CountMeter, () => {
  it('shows the count out of the total', async () => {
    const host = await renderCell(CountMeter, { value: 2, max: 4, label: 'Slots used' });
    expect(host.textContent).toContain('2 of 4');
  });

  it('names what it counts for assistive tech', async () => {
    const host = await renderCell(CountMeter, { value: 2, max: 4, label: 'Slots used' });
    expect(host.querySelector('[aria-label="Slots used"]')).not.toBeNull();
  });
});
