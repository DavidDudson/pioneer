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
const ezrenId = '1d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e11';

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
const seelah = '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e63';

/** Kyra and Seelah, both in the party; Ezren owns Kyra. */
const party = {
  characters: [kyra, seelah].map((characterId, index) => ({
    characterId,
    name: index === 0 ? 'Kyra' : 'Seelah',
    level: 2,
    ownerId: ezrenId,
    ownerName: 'Ezren',
    attachedAt: '2026-10-12T10:00:00.000Z',
    detachable: false,
    archived: false,
  })),
  attachable: [],
};

const toKyra = {
  id: '4c1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e01',
  kind: 'item',
  from: seelah,
  fromName: 'Seelah',
  to: kyra,
  toName: 'Kyra',
  item: '3b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e01',
  itemName: 'Longsword',
  asGiver: false,
  asRecipient: true,
};
const coinsToKyra = {
  id: '4c1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e03',
  kind: 'coins',
  from: seelah,
  fromName: 'Seelah',
  to: kyra,
  toName: 'Kyra',
  coins: { pp: 0, gp: 4, sp: 0, cp: 0 },
  asGiver: false,
  asRecipient: true,
};
/** Made by Ezren's Kyra to Seelah, so Ezren may withdraw it but not accept it. */
const kyraGives = {
  ...toKyra,
  id: '4c1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e02',
  from: kyra,
  to: seelah,
  asGiver: true,
  asRecipient: false,
};

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

/** Opens the campaign home as Ezren with the party and `transfers` answered. */
async function open(transfers: readonly object[], badges: number): Promise<HTMLElement> {
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
  http.expectOne(`/api/campaigns/${id}/members`).flush({ viewerRole: 'player', members: [] });
  http.expectOne(`/api/campaigns/${id}/party`).flush(party);
  await vi.waitFor(() => {
    http.expectOne(`/api/campaigns/${id}/transfers`).flush(transfers);
  });
  const root = present(harness.routeNativeElement);
  await vi.waitFor(() => {
    expect(root.textContent).toContain('Kyra');
  });
  await vi.waitFor(() => {
    harness.detectChanges();
    expect(gifts(root)).toHaveLength(badges);
  });
  return root;
}

/** The gift badges' buttons, in document order. */
function gifts(root: HTMLElement): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>('fr-gift-badge button')];
}

describe('CampaignPartyAvatar', () => {
  it('shows no badge while no offer is open', async () => {
    const root = await open([], 0);
    expect(gifts(root)).toHaveLength(0);
  });

  it('shows a badge only on the character the offer is for', async () => {
    const root = await open([toKyra], 1);
    const badge = present(gifts(root)[0]);
    expect(gifts(root)).toHaveLength(1);
    expect(badge.getAttribute('aria-label')).toBe('A gift is waiting. Show it.');
    expect(present(badge.closest('fr-character-avatar')).textContent).toContain('Kyra');
  });

  it('counts coin and item offers together', async () => {
    const root = await open([toKyra, coinsToKyra], 1);
    const badge = present(gifts(root)[0]);
    expect(badge.textContent.trim()).toBe('2');
    expect(badge.getAttribute('aria-label')).toBe('2 gifts are waiting. Show them.');
  });

  it('opens the offer with Accept and Decline for the recipient, for an item and for coins', async () => {
    const root = await open([toKyra, coinsToKyra], 1);
    present(gifts(root)[0]).click();
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Longsword: Seelah offers it to Kyra');
    });
    expect(root.textContent).toContain('4 gp');
    const labels = [...root.querySelectorAll('pio-campaign-transfer-row button')].map((button) =>
      button.textContent.trim(),
    );
    expect(labels.filter((label) => label.startsWith('Accept'))).toHaveLength(2);
    expect(labels.filter((label) => label.startsWith('Decline'))).toHaveLength(2);
  });

  it('lets only the recipient accept: the giver sees Withdraw and no Accept', async () => {
    const root = await open([kyraGives], 1);
    present(gifts(root)[0]).click();
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Withdraw');
    });
    const labels = [...root.querySelectorAll('pio-campaign-transfer-row button')].map((button) =>
      button.textContent.trim(),
    );
    expect(labels.some((label) => label.startsWith('Accept'))).toBe(false);
  });

  it('closes the offers when the badge is pressed again', async () => {
    const root = await open([toKyra], 1);
    present(gifts(root)[0]).click();
    await vi.waitFor(() => {
      expect(root.querySelector('pio-campaign-transfer-row')).not.toBeNull();
    });
    present(gifts(root)[0]).click();
    await vi.waitFor(() => {
      expect(root.querySelector('pio-campaign-transfer-row')).toBeNull();
    });
  });

  it('drops the badge and the list once the last offer is withdrawn', async () => {
    const root = await open([kyraGives], 1);
    present(gifts(root)[0]).click();
    await vi.waitFor(() => {
      expect(root.querySelector('pio-campaign-transfer-row')).not.toBeNull();
    });
    const http = TestBed.inject(HttpTestingController);
    const withdraw = [...root.querySelectorAll('pio-campaign-transfer-row button')].find((button) =>
      button.textContent.trim().startsWith('Withdraw'),
    );
    present(withdraw as HTMLButtonElement | undefined).click();
    await vi.waitFor(() => {
      http
        .expectOne(`/api/campaigns/${id}/transfers/${kyraGives.id}/withdraw`)
        .flush({ id: kyraGives.id, status: 'withdrawn' });
    });
    await vi.waitFor(() => {
      http.expectOne(`/api/campaigns/${id}/transfers`).flush([]);
    });
    await vi.waitFor(() => {
      expect(gifts(root)).toHaveLength(0);
      expect(root.querySelector('pio-campaign-transfer-row')).toBeNull();
    });
  });
});
