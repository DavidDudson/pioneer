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

const withoutLevel = {
  variantId: 'a8e09e01-8dbe-5055-920b-453ebd93493d',
  name: 'Proficiency Without Level',
  packTitle: 'Core Rules',
};
const gritty = {
  variantId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e11',
  name: 'Gritty Healing',
  packTitle: 'Table Rules',
};

interface VariantRulesJson {
  readonly manageable: boolean;
  readonly enabled: readonly object[];
  readonly available: readonly object[];
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
async function open(rules: VariantRulesJson): Promise<HTMLElement> {
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
    viewerRole: rules.manageable ? 'gm' : 'player',
    members: [{ ...gmMember, displayName: 'Amiri' }],
  });
  http.expectOne(`/api/campaigns/${id}/variant-rules`).flush(rules);
  await harness.fixture.whenStable();
  const root = present(harness.routeNativeElement);
  await vi.waitFor(() => {
    expect(root.textContent).toContain('Proficiency Without Level');
  });
  return root;
}

describe('CampaignVariantRulesPanel', () => {
  it('lists the variant rules of the packs in use by name, each with its pack, for the GM to turn on', async () => {
    const root = await open({ manageable: true, enabled: [], available: [withoutLevel, gritty] });
    expect(root.textContent).toContain('Gritty Healing');
    expect(root.textContent).toContain('Table Rules');
    expect(buttons(root, 'Turn on')).toHaveLength(2);
    expect(buttons(root, 'Turn off')).toHaveLength(0);
  });

  it('gives a player the list and no controls', async () => {
    const root = await open({ manageable: false, enabled: [withoutLevel], available: [] });
    expect(root.textContent).toContain('Only the GM changes which variant rules the campaign uses.');
    expect(buttons(root, 'Turn on')).toHaveLength(0);
    expect(buttons(root, 'Turn off')).toHaveLength(0);
  });

  it('turns a variant rule on, which stays in its place with a Turn off button', async () => {
    const root = await open({ manageable: true, enabled: [], available: [withoutLevel, gritty] });
    const http = TestBed.inject(HttpTestingController);

    present(buttons(root, 'Turn on')[1]).click();
    await vi.waitFor(() => {
      const posted = http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/variant-rules` });
      expect(posted.request.body).toStrictEqual({ variantId: withoutLevel.variantId });
      posted.flush({ manageable: true, enabled: [withoutLevel], available: [gritty] });
    });
    await vi.waitFor(() => {
      expect(buttons(root, 'Turn off')).toHaveLength(1);
    });
    expect(buttons(root, 'Turn on')).toHaveLength(1);
  });
});
