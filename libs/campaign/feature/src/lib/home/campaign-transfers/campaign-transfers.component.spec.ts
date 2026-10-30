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
const playerId = '1d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e11';

const campaign = {
  id,
  version: 1,
  name: 'Abomination Vaults',
  gmId,
  members: [
    { id: '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10', userId: gmId, role: 'gm', joinedAt: '2026-10-10T10:00:00.000Z' },
    {
      id: '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e11',
      userId: playerId,
      role: 'player',
      joinedAt: '2026-10-11T10:00:00.000Z',
    },
  ],
  createdAt: '2026-10-10T10:00:00.000Z',
};

const kyra = '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e62';
const seelah = '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e63';
const longsword = '3b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e01';
const incoming = {
  id: '4c1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e01',
  kind: 'item',
  from: seelah,
  fromName: 'Seelah',
  to: kyra,
  toName: 'Kyra',
  item: longsword,
  itemName: 'Longsword',
  asGiver: false,
  asRecipient: true,
};
const outgoing = {
  ...incoming,
  id: '4c1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e02',
  from: kyra,
  fromName: 'Kyra',
  to: seelah,
  toName: 'Seelah',
  asGiver: true,
  asRecipient: false,
};

const coins = {
  id: '4c1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e03',
  kind: 'coins',
  from: seelah,
  fromName: 'Seelah',
  to: kyra,
  toName: 'Kyra',
  coins: { pp: 0, gp: 4, sp: 2, cp: 0 },
  asGiver: false,
  asRecipient: true,
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

/** Opens the Party Inventory page as Ezren, answering the offers list with `transfers`. */
async function open(transfers: readonly object[]): Promise<Opened> {
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
    http.expectOne(`/api/campaigns/${id}/transfers`).flush(transfers);
  });
  const root = present(harness.routeNativeElement);
  await vi.waitFor(() => {
    expect(root.textContent).toMatch(/Longsword|4 gp|No offers waiting/u);
  });
  return { root, http };
}

describe('CampaignTransfersPanel', () => {
  it('shows an offer to answer with Accept and Decline, and one made with Withdraw', async () => {
    const { root } = await open([incoming, outgoing]);

    expect(root.textContent).toContain('Longsword: Seelah offers it to Kyra');
    expect(root.textContent).toContain('Longsword: Kyra offers it to Seelah');
    expect(buttons(root, 'Accept')).toHaveLength(1);
    expect(buttons(root, 'Decline')).toHaveLength(1);
    expect(buttons(root, 'Withdraw')).toHaveLength(1);
  });

  it('shows a coin offer by its coins, with the same answers', async () => {
    const { root, http } = await open([coins]);

    expect(root.textContent).toContain('4 gp, 2 sp: Seelah offers it to Kyra');
    expect(buttons(root, 'Decline')).toHaveLength(1);

    present(buttons(root, 'Accept')[0]).click();
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Accept 4 gp, 2 sp from Seelah? Press again');
    });
    http.expectNone(`/api/campaigns/${id}/transfers/${coins.id}/accept`);
  });

  it('announces how many offers wait for an answer, politely', async () => {
    const { root } = await open([incoming, outgoing]);

    const announcement = present(root.querySelector('[role="status"]'));
    expect(announcement.textContent).toContain('You have an offer to answer.');
  });

  it('says nothing waits, and announces nothing, when there are no offers', async () => {
    const { root } = await open([]);

    expect(root.textContent).toContain('No offers waiting.');
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('asks again, naming the item and the giver, before accepting', async () => {
    const { root, http } = await open([incoming]);

    present(buttons(root, 'Accept')[0]).click();
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Accept Longsword from Seelah? Press again');
    });
    http.expectNone(`/api/campaigns/${id}/transfers/${incoming.id}/accept`);

    present(buttons(root, 'Accept')[0]).click();
    await vi.waitFor(() => {
      http
        .expectOne(`/api/campaigns/${id}/transfers/${incoming.id}/accept`)
        .flush({ id: incoming.id, status: 'accepted' });
    });
    await vi.waitFor(() => {
      http.expectOne(`/api/campaigns/${id}/transfers`).flush([]);
    });
  });

  it("shows the server's reason when an answer is refused", async () => {
    const { root, http } = await open([outgoing]);

    present(buttons(root, 'Withdraw')[0]).click();
    await vi.waitFor(() => {
      http.expectOne(`/api/campaigns/${id}/transfers/${outgoing.id}/withdraw`).flush(
        {
          type: 'conflict',
          title: 'Conflict',
          status: 409,
          message: { key: 'campaign.transfers.alreadyAnswered' },
        },
        { status: 409, statusText: 'Conflict' },
      );
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('The recipient has already answered that offer.');
    });
  });
});
