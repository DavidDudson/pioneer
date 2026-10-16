import { describe, expect, it } from 'vitest';

import { element, part, renderProjected } from '../../testing/render-projected';
import { PageAside } from './page-aside.component';

describe(PageAside, () => {
  it('is a complementary landmark named by its label', async () => {
    const root = await renderProjected(PageAside, { label: 'Party' }, [element('p', 'Party notes')]);
    const landmark = part(root, 'aside');
    expect(landmark.getAttribute('aria-label')).toBe('Party');
    expect(landmark.textContent.trim()).toBe('Party notes');
  });
});
