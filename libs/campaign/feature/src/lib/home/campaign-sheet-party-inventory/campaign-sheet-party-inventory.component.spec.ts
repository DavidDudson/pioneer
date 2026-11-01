import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import campaignMessages from '../../../i18n/en.json';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';
import { CampaignSheetPartyInventory } from './campaign-sheet-party-inventory.component';

const campaign = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const kyra = '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e62';
const backpack = '3b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e01';
const rope = '3b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e02';
const lantern = '3b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e03';

const characters = [{ characterId: kyra, name: 'Kyra' }];
const stashUrl = `/api/campaigns/${campaign}/party-stash`;

const held = {
  lines: [
    { id: backpack, name: 'Backpack', quantity: 1 },
    { id: rope, name: 'Rope', quantity: 2, container: backpack },
  ],
  characters,
};

/** What a test drives once the container is open. */
interface Opened {
  readonly root: HTMLElement;
  readonly http: HttpTestingController;
  readonly fixture: ComponentFixture<CampaignSheetPartyInventory>;
}

/** Every button whose text starts with `label`. */
function buttons(root: HTMLElement, label: string): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')].filter((candidate) => candidate.textContent.trim().startsWith(label));
}

/** Opens Kyra's container, answering the party stash with `answer` and offering `lines` to put in. */
async function open(answer: object, lines: readonly object[] = []): Promise<Opened> {
  TestBed.configureTestingModule({
    providers: [
      ...provideServerStateTesting(),
      provideI18n({ en: async () => ({ ...frontierMessages, campaign: campaignMessages }) }),
    ],
  });
  const fixture = TestBed.createComponent(CampaignSheetPartyInventory);
  fixture.componentRef.setInput('campaign', campaign);
  fixture.componentRef.setInput('character', kyra);
  fixture.componentRef.setInput('lines', lines);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  await vi.waitFor(() => {
    http.expectOne(stashUrl).flush(answer);
  });
  const root: unknown = fixture.nativeElement;
  if (!(root instanceof HTMLElement)) {
    throw new TypeError('The container did not render');
  }
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(root.textContent).toMatch(/Backpack|empty/u);
  });
  return { root, http, fixture };
}

describe(CampaignSheetPartyInventory, () => {
  it('lists what the party holds, and a line inside a container says which', async () => {
    const { root } = await open(held);

    expect(root.textContent).toContain('Party Inventory');
    expect(root.textContent).toContain('Backpack × 1');
    expect(root.textContent).toContain('In Backpack');
  });

  it('is shown when empty, saying so', async () => {
    const { root } = await open({ lines: [], characters });

    expect(root.textContent).toContain('Party Inventory');
    expect(root.textContent).toContain('The party stash is empty.');
  });

  it('offers a Take on a loose line only, into the sheet’s own character', async () => {
    const { root, http, fixture } = await open(held);

    expect(buttons(root, 'Take')).toHaveLength(1);
    buttons(root, 'Take Backpack')[0]?.click();
    await vi.waitFor(() => {
      const take = http.expectOne({ method: 'POST', url: `${stashUrl}/take` });
      expect(take.request.body).toStrictEqual({ to: kyra, item: backpack });
      take.flush({ lines: [], characters });
    });
    await vi.waitFor(() => {
      http.expectOne(stashUrl).flush({ lines: [], characters });
    });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(root.textContent).toContain('The party stash is empty.');
    });
  });

  it('offers no deposit when the character has no line that may go in', async () => {
    const { root } = await open(held);

    expect(buttons(root, 'Put in the party stash')).toHaveLength(0);
  });

  it('offers a deposit control when the character has a line that may go in', async () => {
    const { root } = await open(held, [{ id: lantern, name: 'Lantern' }]);

    expect(buttons(root, 'Put in the party stash')).toHaveLength(1);
  });
});
