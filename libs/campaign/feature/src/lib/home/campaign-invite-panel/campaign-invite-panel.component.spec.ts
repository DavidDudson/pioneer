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
const playerId = '1d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e11';
const inviteId = '3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a';
const token = 'Wm9vbS16b29tLXRoZS1pbnZpdGUtdG9rZW4tZm9yLXQ';

const gmMember = {
  id: '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10',
  userId: gmId,
  role: 'gm',
  joinedAt: '2026-10-10T10:00:00.000Z',
};
const playerMember = {
  id: '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e11',
  userId: playerId,
  role: 'player',
  joinedAt: '2026-10-11T10:00:00.000Z',
};
const campaign = {
  id,
  version: 1,
  name: 'Abomination Vaults',
  gmId,
  members: [gmMember, playerMember],
  createdAt: '2026-10-10T10:00:00.000Z',
};
const invite = { id: inviteId, createdAt: '2026-10-10T10:00:00.000Z', expiresAt: '2026-10-17T10:00:00.000Z' };

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

/** The button whose text starts with `label`. */
function button(root: HTMLElement, label: string): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')].find((candidate) =>
    candidate.textContent.trim().startsWith(label),
  );
  return present(found);
}

/** Opens the campaign home with the user in `viewerRole`, answering its loads. */
async function open(viewerRole: 'gm' | 'player'): Promise<RouterTestingHarness> {
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
    viewerRole,
    members: [
      { ...gmMember, displayName: 'Amiri' },
      { ...playerMember, displayName: 'Ezren' },
    ],
  });
  await harness.fixture.whenStable();
  return harness;
}

describe('CampaignHomePage members and invites', () => {
  it('names every member with their role', async () => {
    const harness = await open('player');

    await vi.waitFor(() => {
      const text = present(harness.routeNativeElement).textContent;
      expect(text).toContain('Amiri');
      expect(text).toContain('GM');
      expect(text).toContain('Ezren');
      expect(text).toContain('Player');
    });
  });

  it('shows a player no invite tools and never asks for invites', async () => {
    const harness = await open('player');

    await vi.waitFor(() => {
      expect(present(harness.routeNativeElement).textContent).toContain('Ezren');
    });
    expect(present(harness.routeNativeElement).textContent).not.toContain('Invite players');
    TestBed.inject(HttpTestingController).expectNone(`/api/campaigns/${id}/invites`);
  });

  it('lets the GM create a link, shown once to copy, and revoke an open one', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const harness = await open('gm');
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      http.expectOne(`/api/campaigns/${id}/invites`).flush([]);
    });
    const root = present(harness.routeNativeElement);
    await vi.waitFor(() => {
      expect(root.textContent).toContain('No open invite links.');
    });

    button(root, 'Create invite link').click();
    await vi.waitFor(() => {
      const created = http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/invites` });
      created.flush({ invite, token });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain(`/campaigns/join#${token}`);
      expect(root.textContent).toContain('This link is shown only once.');
      expect(root.textContent).not.toContain('No open invite links.');
    });

    button(root, 'Copy link').click();
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`/campaigns/join#${token}$`, 'u')));
    });

    const revoke = button(root, 'Revoke');
    revoke.focus();
    revoke.click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'DELETE', url: `/api/campaigns/${id}/invites/${inviteId}` })
        .flush({ ...invite, revokedAt: '2026-10-10T11:00:00.000Z' });
    });
    // The row stays, marked revoked, so focus and the button's confirmation survive.
    await vi.waitFor(() => {
      expect(present(root.querySelector('pio-campaign-invite-panel fr-badge')).textContent).toContain('Revoked');
    });
    expect(revoke.isConnected).toBe(true);
    expect(document.activeElement).toBe(revoke);
  });

  it('says when an invite link could not be created', async () => {
    const harness = await open('gm');
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      http.expectOne(`/api/campaigns/${id}/invites`).flush([]);
    });
    const root = present(harness.routeNativeElement);

    button(root, 'Create invite link').click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'POST', url: `/api/campaigns/${id}/invites` })
        .flush(
          { type: 'internal', title: 'Internal error', status: 500, message: { key: 'problem.internal' } },
          { status: 500, statusText: 'Internal Server Error' },
        );
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Could not create an invite link.');
    });
  });
});
