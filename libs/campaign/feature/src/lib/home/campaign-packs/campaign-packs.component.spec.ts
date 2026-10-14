import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages, Select } from '@pioneer/frontier';
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

const core = {
  packId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e01',
  title: 'Player Core',
  publisher: 'Paizo',
  official: true,
  requiredBy: [],
  removable: false,
};
const feats = {
  packId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e02',
  title: 'Amiri’s Feats',
  publisher: 'Amiri',
  official: false,
  requiredBy: [],
  removable: true,
};
const spells = {
  packId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e03',
  title: 'Amiri’s Spells',
  publisher: 'Amiri',
  official: false,
  requiredBy: ['Amiri’s Feats'],
  removable: false,
};
const items = {
  packId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e04',
  title: 'Amiri’s Items',
  publisher: 'Amiri',
  official: false,
  private: false,
};
const secret = {
  packId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e05',
  title: 'Amiri’s Secrets',
  publisher: 'Amiri',
  official: false,
  private: true,
};

interface PacksJson {
  readonly manageable: boolean;
  readonly enabled: readonly object[];
  readonly candidates: readonly object[];
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

/** Opens the campaign home as its GM or as a player, answering its loads with `packs`. */
async function open(packs: PacksJson): Promise<RouterTestingHarness> {
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
    viewerRole: packs.manageable ? 'gm' : 'player',
    members: [{ ...gmMember, displayName: 'Amiri' }],
  });
  http.expectOne(`/api/campaigns/${id}/packs`).flush(packs);
  await harness.fixture.whenStable();
  const root = present(harness.routeNativeElement);
  await vi.waitFor(() => {
    expect(root.textContent).toContain('Player Core');
  });
  return harness;
}

/** The pack picker's control. */
function picker(harness: RouterTestingHarness): Select<string> {
  const host = harness.fixture.debugElement.query(By.css('pio-campaign-pack-picker'));
  return host.query(By.directive(Select)).componentInstance as Select<string>;
}

/** Picks `packId` in the picker, the way choosing it from the overlay listbox would. */
function pick(harness: RouterTestingHarness, packId: string): void {
  picker(harness).value.set(packId);
  harness.detectChanges();
}

describe('CampaignPacksPanel', () => {
  it('shows an official pack as always on, and what needs a pack that is extended', async () => {
    const harness = await open({ manageable: false, enabled: [core, feats, spells], candidates: [] });
    const root = present(harness.routeNativeElement);
    expect(root.textContent).toContain('Always on');
    expect(root.textContent).toContain('Needed by Amiri’s Feats');
    expect(buttons(root, 'Disable')).toHaveLength(1);
  });

  it('gives a player the list and no controls', async () => {
    const harness = await open({ manageable: false, enabled: [core, spells], candidates: [] });
    const root = present(harness.routeNativeElement);
    expect(root.textContent).toContain('Only the GM changes which packs the campaign uses.');
    expect(buttons(root, 'Disable')).toHaveLength(0);
    expect(buttons(root, 'Enable pack')).toHaveLength(0);
  });

  it('enables a picked pack, which joins the list and leaves the picker', async () => {
    const harness = await open({ manageable: true, enabled: [core], candidates: [items, secret] });
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);

    pick(harness, items.packId);
    present(buttons(root, 'Enable pack')[0]).click();
    await vi.waitFor(() => {
      const posted = http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/packs` });
      expect(posted.request.body).toStrictEqual({ packId: items.packId });
      posted.flush({
        manageable: true,
        enabled: [core, { ...items, requiredBy: [], removable: true }],
        candidates: [secret],
      });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Amiri’s Items');
      expect(root.textContent).toContain('Enabled');
    });
    expect(
      picker(harness)
        .options()
        .map((option) => option.value),
    ).toStrictEqual([secret.packId]);
    expect(picker(harness).value()).toBe('');
  });

  it('marks a private pack in the picker and says why it was refused', async () => {
    const harness = await open({ manageable: true, enabled: [core], candidates: [secret] });
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);
    expect(picker(harness).options()[0]?.label).toBe('Amiri’s Secrets (private)');

    pick(harness, secret.packId);
    present(buttons(root, 'Enable pack')[0]).click();
    await vi.waitFor(() => {
      http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/packs` }).flush(
        {
          type: 'conflict',
          title: 'Conflict',
          status: 409,
          message: { key: 'campaign.packs.private', params: { pack: 'Amiri’s Secrets' } },
        },
        { status: 409, statusText: 'Conflict' },
      );
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain(
        'Amiri’s Secrets is private. Set it to campaign visibility first, then enable it.',
      );
    });
  });

  it('disables on the first press, marks the row with focus kept, and offers the pack again', async () => {
    const harness = await open({ manageable: true, enabled: [core, feats], candidates: [] });
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);

    const button = present(buttons(root, 'Disable')[0]);
    button.focus();
    button.click();
    await vi.waitFor(() => {
      http.expectOne({ method: 'DELETE', url: `/api/campaigns/${id}/packs/${feats.packId}` }).flush({
        manageable: true,
        enabled: [core],
        candidates: [{ ...items, packId: feats.packId, title: feats.title }],
      });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Disabled');
      expect(root.textContent).toContain('Amiri’s Feats');
    });
    expect(root.ownerDocument.activeElement).toBe(button);
    expect(
      picker(harness)
        .options()
        .map((option) => option.value),
    ).toStrictEqual([feats.packId]);
  });

  it('says so when an enabled pack still extends the one being disabled', async () => {
    const harness = await open({ manageable: true, enabled: [core, { ...spells, removable: true }], candidates: [] });
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);

    present(buttons(root, 'Disable')[0]).click();
    await vi.waitFor(() => {
      http.expectOne({ method: 'DELETE', url: `/api/campaigns/${id}/packs/${spells.packId}` }).flush(
        {
          type: 'conflict',
          title: 'Conflict',
          status: 409,
          message: { key: 'campaign.packs.requiredByRefusal', params: { packs: 'Amiri’s Feats' } },
        },
        { status: 409, statusText: 'Conflict' },
      );
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Amiri’s Feats still extend this pack. Disable them first.');
    });
  });
});
