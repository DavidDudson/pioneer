import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { campaignRoutes } from '../../campaign.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const gmId = '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d';
const kyra = '4c1a7e3b-2d5f-4a8c-9e6b-7d1f0a3c5b92';
const mordred = '5d2b8f4c-3e6a-4b9d-8f7c-8e2a1b4d6c03';
const caliburn = '9a2b4c6d-1e3f-4a5b-8c7d-0e1f2a3b4c5d';
const longsword = '2b3c4d5e-6f70-4a81-92b3-c4d5e6f70819';
const flaming = '3c4d5e6f-7081-4b92-a3c4-d5e6f7081920';

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

function partyCharacter(characterId: string, name: string): object {
  return {
    characterId,
    name,
    level: 5,
    ownerId: gmId,
    ownerName: 'Ezren',
    attachedAt: '2026-10-11T10:00:00.000Z',
    vitals: { dying: 0, conditions: [] },
    detachable: false,
    archived: false,
  };
}

const party = { characters: [partyCharacter(kyra, 'Kyra'), partyCharacter(mordred, 'Mordred')], attachable: [] };

/** Caliburn with six property runes, one more than the table allows, held by `holder` or the stash. */
function keyItems(holder: 'kyra' | 'stash', manageable = true, owned = false): object {
  return {
    manageable,
    keyItems: [
      {
        id: caliburn,
        name: 'Caliburn',
        base: { item: longsword, name: 'Longsword' },
        runes: {
          potency: 3,
          property: ['Flaming', 'Frost', 'Shock', 'Corrosive', 'Ghost Touch', 'Grievous'].map((name) => ({
            rune: flaming,
            name,
          })),
        },
        notes: 'Drawn from the stone.',
        holderOwned: holder === 'kyra' && owned,
        ...(holder === 'kyra' ? { holder: kyra, holderName: 'Kyra' } : {}),
      },
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

/** The page the spec opened last, so a pick can reach its pickers. */
let opened: RouterTestingHarness | undefined = undefined;

/**
 * The picker inside `host`. The table renders no rows in the page harness, so a spec reads and picks on the picker
 * itself: its own specs press the rows.
 */
function pickerIn(host: string): Picker<string, object> {
  const found = present(opened).fixture.debugElement.query(By.css(host)).query(By.directive(Picker));
  return found.injector.get<Picker<string, object>>(Picker);
}

/** The labels a picker offers, in order. */
function labelsOf(picker: Picker<string, object>): readonly string[] {
  return picker.rows().map((row) => picker.rowLabel()(row));
}

/** Picks the row labelled `label` in the picker. */
function pickLabel(picker: Picker<string, object>, label: string): void {
  const row = present(picker.rows().find((each) => picker.rowLabel()(each) === label));
  picker.value.set(picker.rowValue()(row));
  present(opened).detectChanges();
}

/** Opens the campaign home as its GM or as a player, answering the key items load with `items`. */
async function open(items: object, gm: boolean): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'campaigns', children: campaignRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(`/campaigns/${id}/inventory`);
  opened = harness;
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
  http.expectOne(`/api/campaigns/${id}/members`).flush({
    viewerRole: gm ? 'gm' : 'player',
    members: [{ ...gmMember, displayName: 'Amiri' }],
  });
  await vi.waitFor(() => {
    http.expectOne(`/api/campaigns/${id}/party`).flush(party);
  });
  await vi.waitFor(() => {
    http.expectOne(`/api/campaigns/${id}/key-items`).flush(items);
  });
  const root = present(harness.routeNativeElement);
  await vi.waitFor(() => {
    expect(root.textContent).toContain('Caliburn');
  });
  return root;
}

/** Caliburn held by Kyra, and Excalibur in the party stash. */
function twoKeyItems(): object {
  const [held] = (keyItems('kyra', false) as { keyItems: object[] }).keyItems;
  const stashed = {
    ...held,
    id: '7e1f3a5b-9c2d-4e6f-8a0b-1c3d5e7f9a2b',
    name: 'Excalibur',
    holder: undefined,
    holderName: undefined,
  };
  return { manageable: false, keyItems: [held, stashed] };
}

/** Picks `label` in the holder filter. */
function filterBy(label: string): void {
  pickLabel(pickerIn('pio-campaign-key-item-filter'), label);
}

describe('CampaignKeyItemsPanel', () => {
  it('filters the key items by holder, and by the party stash', async () => {
    const root = await open(twoKeyItems(), false);
    expect(root.textContent).toContain('Excalibur');

    filterBy('Kyra');
    await vi.waitFor(() => {
      expect(root.textContent).not.toContain('Excalibur');
    });
    expect(root.textContent).toContain('Caliburn');

    filterBy('Party stash');
    await vi.waitFor(() => {
      expect(root.textContent).not.toContain('Caliburn');
    });
    expect(root.textContent).toContain('Excalibur');
  });

  it('says no key item is held when the filter keeps none', async () => {
    const root = await open(keyItems('kyra', false), false);

    filterBy('Party stash');

    await vi.waitFor(() => {
      expect(root.textContent).toContain('No key items for this holder.');
    });
  });

  it('links the holder to their sheet for the viewer who owns that character', async () => {
    const root = await open(keyItems('kyra', false, true), false);
    const link = present(root.querySelector('pio-campaign-key-item-row a'));
    expect(link.textContent.trim()).toBe('Kyra');
    expect(link.getAttribute('href')).toBe(`/characters/${kyra}`);
  });

  it('names a holder the viewer does not own without a link, as they could not open the sheet', async () => {
    const root = await open(keyItems('kyra', false, false), false);
    expect(root.querySelector('pio-campaign-key-item-row a')).toBeNull();
    expect(root.textContent).toContain('Held by Kyra');
  });

  it('lists the key item with its base, runes as stated, notes and holder', async () => {
    const root = await open(keyItems('kyra'), true);
    expect(root.textContent).toContain('(Longsword)');
    expect(root.textContent).toContain('Potency +3');
    expect(root.textContent).toContain('6 property runes: Flaming, Frost, Shock, Corrosive, Ghost Touch, Grievous');
    expect(root.textContent).toContain('Drawn from the stone.');
    expect(root.textContent).toContain('Held by Kyra');
  });

  it('says the party stash holds a key item no character does', async () => {
    const root = await open(keyItems('stash'), true);
    expect(root.textContent).toContain('Held by the party stash');
    expect(buttons(root, 'Take back')).toHaveLength(0);
  });

  it('shows a player the key items read-only, with no controls and no form', async () => {
    const root = await open(keyItems('kyra', false), false);
    expect(root.textContent).toContain('Only the GM creates key items and gives them to characters.');
    expect(buttons(root, 'Give')).toHaveLength(0);
    expect(buttons(root, 'Take back')).toHaveLength(0);
    expect(buttons(root, 'Archive')).toHaveLength(0);
    expect(root.querySelector('pio-campaign-key-item-form')).toBeNull();
  });

  it('takes a key item back from its holder to the stash', async () => {
    const root = await open(keyItems('kyra'), true);
    const http = TestBed.inject(HttpTestingController);

    present(buttons(root, 'Take back Caliburn')[0]).click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'DELETE', url: `/api/campaigns/${id}/key-items/${caliburn}/holder` })
        .flush(keyItems('stash'));
    });

    await vi.waitFor(() => {
      expect(root.textContent).toContain('Held by the party stash');
    });
  });

  it('archives a key item, which leaves the list', async () => {
    const root = await open(keyItems('kyra'), true);
    const http = TestBed.inject(HttpTestingController);

    present(buttons(root, 'Archive Caliburn')[0]).click();
    await vi.waitFor(() => {
      http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/key-items/${caliburn}/archive` }).flush({
        manageable: true,
        keyItems: [],
      });
    });

    await vi.waitFor(() => {
      expect(root.textContent).toContain('No key items yet.');
    });
  });

  it('gives a key item to another character in the party, which moves it', async () => {
    const root = await open(keyItems('kyra'), true);
    const http = TestBed.inject(HttpTestingController);

    const holder = pickerIn('pio-campaign-key-item-holder');
    expect(labelsOf(holder)).toContain('Mordred');
    expect(labelsOf(holder)).not.toContain('Kyra');
    pickLabel(holder, 'Mordred');

    await vi.waitFor(() => {
      expect(present(buttons(root, 'Give Caliburn')[0]).disabled).toBe(false);
    });
    present(buttons(root, 'Give Caliburn')[0]).click();
    await vi.waitFor(() => {
      const call = http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/key-items/${caliburn}/holder` });
      expect(call.request.body).toStrictEqual({ characterId: mordred });
      call.flush({
        manageable: true,
        keyItems: [
          {
            ...(keyItems('kyra') as { keyItems: object[] }).keyItems[0],
            holder: mordred,
            holderName: 'Mordred',
          },
        ],
      });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Held by Mordred');
    });
  });
});
