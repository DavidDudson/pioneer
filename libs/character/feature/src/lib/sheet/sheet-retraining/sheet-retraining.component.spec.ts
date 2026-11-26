import { beforeAll, describe, expect, it, vi } from 'vitest';

import { openRetraining, settle, SHEET_PACKS } from '../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';

describe('SheetRetraining', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting(SHEET_PACKS);
  }, PREBUILD_TIMEOUT);

  it('is a section of the Downtime tab, with its explanation', async () => {
    const retraining = await openRetraining();

    await vi.waitFor(async () => {
      await settle();
      expect(retraining.textContent).toContain('Swap a feat, skill increase, spell or class choice');
    });
  });
});
