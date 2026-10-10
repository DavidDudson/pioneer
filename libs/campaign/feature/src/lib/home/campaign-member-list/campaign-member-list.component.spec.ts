import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import { campaignRoutes } from '../../campaign.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const gmId = '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d';
const playerId = '1d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e11';

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
const named = [
  { ...gmMember, displayName: 'Amiri' },
  { ...playerMember, displayName: 'Ezren' },
];

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

/** The only button whose text starts with `label`. */
function button(root: HTMLElement, label: string): HTMLButtonElement {
  const [found, ...others] = buttons(root, label);
  expect(others).toHaveLength(0);
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
  http.expectOne(`/api/campaigns/${id}/members`).flush({ viewerRole, members: named });
  await harness.fixture.whenStable();
  if (viewerRole === 'gm') {
    await vi.waitFor(() => {
      http.expectOne(`/api/campaigns/${id}/invites`).flush([]);
    });
  }
  const root = present(harness.routeNativeElement);
  await vi.waitFor(() => {
    expect(root.textContent).toContain('Ezren');
  });
  return harness;
}
describe('CampaignMemberList', () => {
  it('removes a player on a second press of the same button, then marks them removed with focus kept', async () => {
    const harness = await open('gm');
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);

    const remove = button(root, 'Remove');
    remove.focus();
    remove.click();
    await vi.waitFor(() => {
      expect(remove.textContent).toContain('Remove Ezren? Press again');
    });
    http.expectNone({ method: 'DELETE' });

    remove.click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'DELETE', url: `/api/campaigns/${id}/members/${playerMember.id}` })
        .flush({ viewerRole: 'gm', members: [named[0]] });
    });
    await vi.waitFor(() => {
      // The campaign's member count refreshes now.
      http.expectOne(`/api/campaigns/${id}`).flush({ ...campaign, version: 2, members: [gmMember] });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Removed');
      expect(buttons(root, 'Make GM')).toHaveLength(0);
    });
    expect(root.ownerDocument.activeElement).toBe(remove);
  });

  it('stands down when the GM moves away, without a request', async () => {
    const harness = await open('gm');
    const root = present(harness.routeNativeElement);

    const transfer = button(root, 'Make GM');
    transfer.click();
    await vi.waitFor(() => {
      expect(transfer.textContent).toContain('Make Ezren the GM? Press again');
    });
    transfer.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await vi.waitFor(() => {
      expect(transfer.textContent).not.toContain('Press again');
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'POST' });
  });

  it('hands the GM role over, after which the user is offered Leave', async () => {
    const harness = await open('gm');
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);
    expect(root.textContent).toContain('To leave, first make another member the GM.');
    expect(buttons(root, 'Leave campaign')).toHaveLength(0);

    const transfer = button(root, 'Make GM');
    transfer.click();
    await vi.waitFor(() => {
      expect(transfer.textContent).toContain('Press again');
    });
    transfer.click();
    await vi.waitFor(() => {
      const request = http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/gm` });
      expect(request.request.body).toStrictEqual({ memberId: playerMember.id });
      request.flush({
        viewerRole: 'player',
        members: [
          { ...named[0], role: 'player' },
          { ...named[1], role: 'gm' },
        ],
      });
    });
    await vi.waitFor(() => {
      http.expectOne(`/api/campaigns/${id}`).flush({ ...campaign, version: 2, gmId: playerId });
    });
    await vi.waitFor(() => {
      expect(buttons(root, 'Leave campaign')).toHaveLength(1);
      expect(buttons(root, 'Remove')).toHaveLength(0);
      expect(root.textContent).not.toContain('Invite players');
    });
  });

  it('lets a player leave, then shows their campaigns', async () => {
    const harness = await open('player');
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);
    expect(buttons(root, 'Remove')).toHaveLength(0);

    const leave = button(root, 'Leave campaign');
    leave.click();
    await vi.waitFor(() => {
      expect(leave.textContent).toContain('Leave for good? Press again');
    });
    leave.click();
    await vi.waitFor(() => {
      http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/leave` }).flush({});
    });
    await vi.waitFor(() => {
      http.expectOne({ method: 'GET', url: '/api/campaigns' }).flush([]);
    });
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/campaigns');
      expect(present(harness.routeNativeElement).querySelector('pio-campaign-member-list')).toBeNull();
    });
  });

  it('says why a change failed, next to its button', async () => {
    const harness = await open('player');
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);

    const leave = button(root, 'Leave campaign');
    leave.click();
    await vi.waitFor(() => {
      expect(leave.textContent).toContain('Press again');
    });
    leave.click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'POST', url: `/api/campaigns/${id}/leave` })
        .flush(
          { type: 'internal', title: 'Internal', status: 500, message: { key: 'problem.internal' } },
          { status: 500, statusText: 'Internal Server Error' },
        );
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Could not leave the campaign. Try again.');
    });
  });
});
