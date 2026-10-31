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
});
