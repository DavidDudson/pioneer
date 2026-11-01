import { describe, expect, it } from 'vitest';

import { renderProjected } from '../../testing/render-projected';
import { Responsive } from './responsive.component';

describe(Responsive, () => {
  it('is hidden below the size it shows from', async () => {
    const host = await renderProjected(Responsive, { showFrom: 'lg' }, []);

    expect(host.classList.contains('hidden')).toBe(true);
    expect(host.classList.contains('@lg:block')).toBe(true);
  });

  it('is shown below the size it hides from', async () => {
    const host = await renderProjected(Responsive, { hideFrom: 'lg' }, []);

    expect(host.classList.contains('block')).toBe(true);
    expect(host.classList.contains('@lg:hidden')).toBe(true);
  });
});
