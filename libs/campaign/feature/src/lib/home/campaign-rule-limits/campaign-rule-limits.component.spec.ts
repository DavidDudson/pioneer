import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import { campaignRoutes } from '../../campaign.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const gmId = '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d';

const gmMember = {
  id: '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10',
  userId: gmId,
  role: 'gm',
  joinedAt: '2026-10-10T10:00:00.000Z',
};
const campaign = {
  id,
  version: 1,
  name: 'Abomination Vaults',
  gmId,
  members: [gmMember],
  createdAt: '2026-10-10T10:00:00.000Z',
};

/** The four limits at the core rules' numbers, with `invested` set to `value` when it is not the core number. */
function limits(manageable: boolean, invested: number, source = invested === 10 ? 'core' : 'campaign'): object {
  const base = { custom: false, source: 'core' };
  return {
    manageable,
    limits: [
      { limit: 'investedMax', value: invested, core: 10, ceiling: 100, custom: source === 'campaign', source },
      { limit: 'handsMax', value: 2, core: 2, ceiling: 10, ...base },
      { limit: 'propertyRunesPerGrade', value: 1, core: 1, ceiling: 10, ...base },
      { limit: 'itemsMax', value: 500, core: 500, ceiling: 5000, ...base },
    ],
  };
}

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

/** Every button whose text starts with `label`, in document order. */
function buttons(root: HTMLElement, label: string): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')].filter((candidate) => candidate.textContent.trim().startsWith(label));
}

/** Opens the campaign home as its GM or as a player, answering its loads with `rules`. */
async function open(rules: object, gm: boolean): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'campaigns', children: campaignRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(`/campaigns/${id}`);
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(`/api/campaigns/${id}`).flush(campaign);
  http.expectOne(`/api/campaigns/${id}/members`).flush({
    viewerRole: gm ? 'gm' : 'player',
    members: [{ ...gmMember, displayName: 'Amiri' }],
  });
  await vi.waitFor(() => {
    http.expectOne(`/api/campaigns/${id}/rule-limits`).flush(rules);
  });
  const root = present(harness.routeNativeElement);
  await vi.waitFor(() => {
    expect(root.textContent).toContain('Table limits');
    expect(root.textContent).toContain('Items invested');
  });
  return root;
}

describe('CampaignRuleLimitsPanel', () => {
  it('lists the four limits with the core rules’ number beside each', async () => {
    const root = await open(limits(true, 10), true);
    for (const name of ['Items invested', 'Hands to hold things in', 'Property runes per potency rune grade']) {
      expect(root.textContent).toContain(name);
    }
    expect(root.textContent).toContain('Core rules: 500');
    expect(root.textContent).toContain('From the core rules');
    expect(buttons(root, 'Reset')).toHaveLength(0);
  });

  it('gives a player the numbers and no controls', async () => {
    const root = await open(limits(false, 12), false);
    expect(root.textContent).toContain('Only the GM changes the table limits.');
    expect(root.textContent).toContain('12');
    expect(buttons(root, 'Reset')).toHaveLength(0);
  });

  it('offers a reset for a limit the GM changed, and shows the core number after it', async () => {
    const root = await open(limits(true, 12), true);
    expect(root.textContent).toContain('Changed');
    const http = TestBed.inject(HttpTestingController);

    present(buttons(root, 'Reset')[0]).click();
    await vi.waitFor(() => {
      http.expectOne({ method: 'DELETE', url: `/api/campaigns/${id}/rule-limits/investedMax` }).flush(limits(true, 10));
    });
    await vi.waitFor(() => {
      expect(buttons(root, 'Reset')).toHaveLength(0);
    });
  });

  it('says where each number comes from', async () => {
    const root = await open(limits(true, 12, 'variant'), true);
    expect(root.textContent).toContain('From a variant rule');
    expect(root.textContent).toContain('From the core rules');
    expect(root.textContent).not.toContain('Changed');
    expect(buttons(root, 'Reset')).toHaveLength(0);
  });

  it('says a number is the GM’s once the GM sets it', async () => {
    const root = await open(limits(true, 12), true);
    expect(root.textContent).toContain('Set by the GM');
  });
});
