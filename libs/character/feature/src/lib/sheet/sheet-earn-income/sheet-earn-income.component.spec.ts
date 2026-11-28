import { beforeAll, describe, expect, it, vi } from 'vitest';

import { openIncome, settle, SHEET_PACKS } from '../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';

describe('SheetEarnIncome', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting(SHEET_PACKS);
  }, PREBUILD_TIMEOUT);

  it('is a section of the Downtime tab, and says so when no skill is trained', async () => {
    const income = await openIncome();

    await vi.waitFor(async () => {
      await settle();
      expect(income.textContent).toContain('Earn Income needs a skill you are trained in.');
    });
  });
});
