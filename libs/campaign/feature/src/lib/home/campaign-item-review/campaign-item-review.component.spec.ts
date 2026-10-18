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
const kyra = '4c1a7e3b-2d5f-4a8c-9e6b-7d1f0a3c5b92';
const caliburn = '9a2b4c6d-1e3f-4a5b-8c7d-0e1f2a3b4c5d';
const approval = '1d2e3f4a-5b6c-4d7e-8f90-a1b2c3d4e5f6';

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

const flagged = {
  character: kyra,
  characterName: 'Kyra',
  item: caliburn,
  itemName: 'Caliburn',
  rule: 'propertyRunes',
  count: 7,
};

/** The view while Caliburn needs review (the GM's), or with it approved. */
function review(state: 'open' | 'approved', manageable = true): object {
  return {
    manageable,
    needsReview: state === 'open' && manageable ? [flagged] : [],
    approved: state === 'approved' ? [{ ...flagged, approval, approvedCount: 7 }] : [],
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

/** Every button whose text contains `text`; a button asking to confirm holds its label as well as its own text. */
function buttonsWith(root: HTMLElement, text: string): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')].filter((candidate) => candidate.textContent.includes(text));
}

/** Opens the campaign home as its GM or as a player, answering the review load with `items`. */
async function open(items: object, gm: boolean): Promise<HTMLElement> {
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
    http.expectOne(`/api/campaigns/${id}/item-approvals`).flush(items);
  });
  const root = present(harness.routeNativeElement);
  await vi.waitFor(() => {
    expect(root.textContent).toContain('Rule-breaking items');
  });
  return root;
}

describe('CampaignItemReviewPanel', () => {
  it('lists what needs review for the GM, with the character, the item and the reason', async () => {
    const root = await open(review('open'), true);
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Needs review');
      expect(root.textContent).toContain('Caliburn, Kyra');
      expect(root.textContent).toContain('Property runes: 7');
    });
    expect(buttons(root, 'Approve')).toHaveLength(1);
  });

  it('approves an item, which moves it to the approved list as approved by the GM', async () => {
    const root = await open(review('open'), true);
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      expect(buttons(root, 'Approve')).toHaveLength(1);
    });

    present(buttons(root, 'Approve')[0]).click();
    await vi.waitFor(() => {
      const call = http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/item-approvals` });
      expect(call.request.body).toMatchObject({ character: kyra, item: caliburn, rule: 'propertyRunes' });
      call.flush(review('approved'));
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Approved by the GM');
      expect(buttons(root, 'Revoke')).toHaveLength(1);
      expect(buttons(root, 'Approve')).toHaveLength(0);
    });
  });

  it('makes an item a key item after a confirmation naming it and its holder, and it leaves the list', async () => {
    const root = await open(review('open'), true);
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      expect(buttons(root, 'Make key item')).toHaveLength(1);
    });

    present(buttons(root, 'Make key item')[0]).click();
    await vi.waitFor(() => {
      expect(buttonsWith(root, 'Make Caliburn a key item held by Kyra?')).toHaveLength(1);
    });
    http.expectNone(`/api/campaigns/${id}/key-items/promote`);
    present(buttonsWith(root, 'Make Caliburn a key item held by Kyra?')[0]).click();
    await vi.waitFor(() => {
      const call = http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/key-items/promote` });
      expect(call.request.body).toMatchObject({ character: kyra, item: caliburn, rule: 'propertyRunes' });
      call.flush({ manageable: true, keyItems: [] });
    });
    await vi.waitFor(() => {
      http.expectOne({ method: 'GET', url: `/api/campaigns/${id}/item-approvals` }).flush(review('open', true));
    });
  });

  it('says so when the item changed since the list loaded, and keeps it listed', async () => {
    const root = await open(review('open'), true);
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      expect(buttons(root, 'Make key item')).toHaveLength(1);
    });

    present(buttons(root, 'Make key item')[0]).click();
    await vi.waitFor(() => {
      expect(buttonsWith(root, 'Make Caliburn a key item held by Kyra?')).toHaveLength(1);
    });
    present(buttonsWith(root, 'Make Caliburn a key item held by Kyra?')[0]).click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'POST', url: `/api/campaigns/${id}/key-items/promote` })
        .flush({ title: 'Not found' }, { status: 404, statusText: 'Not Found' });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Could not make it a key item.');
    });
    expect(root.textContent).toContain('Caliburn, Kyra');
  });

  it('shows a player the approved items and no controls, and not what needs review', async () => {
    const root = await open(review('approved', false), false);
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Approved by the GM');
    });
    expect(root.textContent).toContain('Only the GM approves rule-breaking items.');
    expect(root.textContent).not.toContain('Needs review');
    expect(buttons(root, 'Approve')).toHaveLength(0);
    expect(buttons(root, 'Revoke')).toHaveLength(0);
  });
});
