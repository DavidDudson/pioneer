import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { campaignRoutes } from '../../campaign.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const gmId = '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d';

const campaign = {
  id,
  version: 1,
  name: 'Abomination Vaults',
  gmId,
  members: [
    { id: '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10', userId: gmId, role: 'gm', joinedAt: '2026-10-10T10:00:00.000Z' },
  ],
  createdAt: '2026-10-10T10:00:00.000Z',
};

const kyra = '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e62';
const backpack = '3b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e01';
const rope = '3b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e02';

const stash = {
  lines: [
    { id: backpack, name: 'Backpack', quantity: 1 },
    { id: rope, name: 'Rope', quantity: 2, container: backpack },
  ],
  characters: [{ characterId: kyra, name: 'Kyra' }],
};

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

/** What a test drives once the page is open. */
interface Opened {
  readonly root: HTMLElement;
  readonly http: HttpTestingController;
}

/** Opens the Party Inventory page, answering the party stash with `held`. */
async function open(held: object): Promise<Opened> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'campaigns', children: campaignRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(`/campaigns/${id}/inventory`);
  const host: unknown = harness.fixture.nativeElement;
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('The page did not render');
  }
  document.body.append(host);
  onTestFinished(() => {
    host.remove();
  });
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(`/api/campaigns/${id}`).flush(campaign);
  http.expectOne(`/api/campaigns/${id}/members`).flush({ viewerRole: 'player', members: [] });
  await vi.waitFor(() => {
    http.expectOne(`/api/campaigns/${id}/party`).flush({ characters: [], attachable: [] });
  });
  await vi.waitFor(() => {
    http.expectOne(`/api/campaigns/${id}/key-items`).flush({ manageable: false, keyItems: [] });
  });
  await vi.waitFor(() => {
    http.expectOne(`/api/campaigns/${id}/transfers`).flush([]);
  });
  await vi.waitFor(() => {
    http.expectOne(`/api/campaigns/${id}/party-stash`).flush(held);
  });
  const root = present(harness.routeNativeElement);
  await vi.waitFor(() => {
    expect(root.textContent).toMatch(/Backpack|The party stash is empty/u);
  });
  return { root, http };
}

describe('CampaignPartyStashPanel', () => {
  it('lists what the party holds, and a line inside a container says which', async () => {
    const { root } = await open(stash);

    expect(root.textContent).toContain('Backpack × 1');
    expect(root.textContent).toContain('Rope × 2');
    expect(root.textContent).toContain('In Backpack');
  });

  it('offers each of the viewers characters a Take on a loose line, and none on a line inside a container', async () => {
    const { root } = await open(stash);

    expect(buttons(root, 'Take with Kyra')).toHaveLength(1);
  });

  it('takes a line into the chosen character and reads the stash again', async () => {
    const { root, http } = await open(stash);

    present(buttons(root, 'Take with Kyra')[0]).click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'POST', url: `/api/campaigns/${id}/party-stash/take` })
        .flush({ lines: [], characters: stash.characters });
    });
    await vi.waitFor(() => {
      http.expectOne(`/api/campaigns/${id}/party-stash`).flush({ lines: [], characters: stash.characters });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('The party stash is empty.');
    });
  });

  it('says the stash is empty when it holds nothing', async () => {
    const { root } = await open({ lines: [], characters: stash.characters });

    expect(root.textContent).toContain('The party stash is empty.');
    expect(buttons(root, 'Take with')).toHaveLength(0);
  });
});
