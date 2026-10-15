import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { openSheet, present } from '../../testing/sheet-page-harness';

const unenabled = {
  campaign: 'Abomination Vaults',
  variantRules: [{ variantId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e11', name: 'Dual Class', packTitle: 'Table Rules' }],
  packs: [{ packId: '7b2f1c3d-9e5a-4f8b-8d4c-2b3c4d5e6f22', title: 'Table Rules', publisher: 'Someone' }],
  items: [{ item: '9c3d2e4f-1a6b-4a9c-9e5d-3c4d5e6f7a33', name: 'Brew Lantern', packTitle: 'Table Rules' }],
};

describe('SheetUnenabledContent', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('names each variant rule, pack and item the campaign has not enabled, and blocks nothing', async () => {
    const { root } = await openSheet(undefined, { unenabledContent: unenabled });
    const warning = present(root.querySelector<HTMLElement>('pio-sheet-unenabled-content'));
    await vi.waitFor(() => {
      expect(warning.textContent).toContain('Abomination Vaults');
    });
    expect(warning.textContent).toContain('Abomination Vaults has not enabled some of what this character uses.');
    expect(warning.textContent).toContain('Dual Class (Table Rules)');
    expect(warning.textContent).toContain('Table Rules (Someone)');
    expect(warning.textContent).toContain('Brew Lantern (Table Rules)');
    expect(root.textContent).toContain('Merisiel');
  });

  it('shows nothing once the campaign enables it or the character stops using it', async () => {
    const { root } = await openSheet(undefined, {
      unenabledContent: { campaign: 'Abomination Vaults', variantRules: [], packs: [], items: [] },
    });
    expect(present(root.querySelector('pio-sheet-unenabled-content')).textContent.trim()).toBe('');
  });
});
