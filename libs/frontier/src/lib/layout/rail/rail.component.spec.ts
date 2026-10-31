import { describe, expect, it } from 'vitest';

import { element, part, renderProjected } from '../../testing/render-projected';
import { Rail } from './rail.component';

describe(Rail, () => {
  it('is a complementary landmark named by its label', async () => {
    const root = await renderProjected(Rail, { label: 'Skills' }, [element('p', 'Acrobatics')]);
    const landmark = part(root, 'aside');
    expect(landmark.getAttribute('aria-label')).toBe('Skills');
    expect(landmark.textContent.trim()).toBe('Acrobatics');
  });

  it('stacks above the content when narrower, unless it is hidden there', async () => {
    const stacked = await renderProjected(Rail, { label: 'Skills' }, []);
    const hidden = await renderProjected(Rail, { label: 'Skills', hiddenNarrow: true }, []);

    expect(stacked.classList.contains('block')).toBe(true);
    expect(stacked.classList.contains('hidden')).toBe(false);
    expect(hidden.classList.contains('hidden')).toBe(true);
    expect(hidden.classList.contains('@lg:block')).toBe(true);
  });
});
