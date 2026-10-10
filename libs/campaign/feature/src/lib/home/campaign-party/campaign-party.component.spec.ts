import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages, Select } from '@pioneer/frontier';
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

const valeros = { characterId: '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e60', name: 'Valeros', level: 3 };
const merisiel = { characterId: '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e61', name: 'Merisiel', level: 1 };
const kyra = { characterId: '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e62', name: 'Kyra', level: 2 };

/** `character` in the party, played by Ezren. */
function inParty(character: typeof valeros, detachable: boolean): object {
  return { ...character, ownerId: playerId, ownerName: 'Ezren', attachedAt: '2026-10-12T10:00:00.000Z', detachable };
}

interface PartyJson {
  readonly characters: readonly object[];
  readonly attachable: readonly (typeof valeros)[];
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

/** Opens the campaign home as Ezren, a player, answering its loads with `party`. */
async function open(party: PartyJson): Promise<RouterTestingHarness> {
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
  http.expectOne(`/api/campaigns/${id}/members`).flush({ viewerRole: 'player', members: named });
  http.expectOne(`/api/campaigns/${id}/party`).flush(party);
  await harness.fixture.whenStable();
  const root = present(harness.routeNativeElement);
  await vi.waitFor(() => {
    expect(root.textContent).toContain('Bring a character');
  });
  return harness;
}

/** The picker's control. */
function picker(harness: RouterTestingHarness): Select<string> {
  return harness.fixture.debugElement.query((element) => element.componentInstance instanceof Select)
    .componentInstance as Select<string>;
}

/** The text of every badge, in document order. */
function badges(root: HTMLElement): string[] {
  return [...root.querySelectorAll('fr-badge')].map((badge) => badge.textContent.trim());
}

/** Picks `characterId` in the picker, the way choosing it from the overlay listbox would. */
function pick(harness: RouterTestingHarness, characterId: string): void {
  picker(harness).value.set(characterId);
  harness.detectChanges();
}

describe('CampaignPartyPanel', () => {
  it('shows each character with its level and player, and Detach only where the user may', async () => {
    const harness = await open({
      characters: [inParty(valeros, true), { ...inParty(kyra, false), ownerName: 'Seelah' }],
      attachable: [merisiel],
    });
    const root = present(harness.routeNativeElement);
    expect(root.textContent).toContain('Level 3, played by Ezren');
    expect(root.textContent).toContain('Level 2, played by Seelah');
    expect(buttons(root, 'Detach')).toHaveLength(1);
  });

  it('says when the party is empty', async () => {
    const harness = await open({ characters: [], attachable: [valeros] });
    const root = present(harness.routeNativeElement);
    expect(root.textContent).toContain('No characters in the party yet.');
  });

  it('brings a picked character in, which joins the party and leaves the picker', async () => {
    const harness = await open({ characters: [], attachable: [valeros, merisiel] });
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);

    pick(harness, valeros.characterId);
    present(root.querySelector<HTMLButtonElement>('button[type="submit"]')).click();
    await vi.waitFor(() => {
      const posted = http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/characters` });
      expect(posted.request.body).toStrictEqual({ characterId: valeros.characterId });
      posted.flush({ characters: [inParty(valeros, true)], attachable: [merisiel] });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Level 3, played by Ezren');
      expect(root.textContent).toContain('Brought in');
    });
    expect(
      picker(harness)
        .options()
        .map((option) => option.value),
    ).toStrictEqual([merisiel.characterId]);
    expect(picker(harness).value()).toBe('');
  });

  it('says so when another campaign took the character first', async () => {
    const harness = await open({ characters: [], attachable: [valeros] });
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);

    pick(harness, valeros.characterId);
    present(root.querySelector<HTMLButtonElement>('button[type="submit"]')).click();
    await vi.waitFor(() => {
      http.expectOne({ method: 'POST', url: `/api/campaigns/${id}/characters` }).flush(
        {
          type: 'conflict',
          title: 'Conflict',
          status: 409,
          message: { key: 'campaign.party.inOtherCampaign' },
        },
        { status: 409, statusText: 'Conflict' },
      );
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('That character is already in another campaign. Detach it there first.');
    });
  });

  it('detaches on the first press, marks the row with focus kept, and offers the character again', async () => {
    const harness = await open({ characters: [inParty(valeros, true)], attachable: [] });
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);
    expect(root.textContent).toContain('None of your characters is free to bring.');

    const [detach] = buttons(root, 'Detach');
    const button = present(detach);
    button.focus();
    button.click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'DELETE', url: `/api/campaigns/${id}/characters/${valeros.characterId}` })
        .flush({ characters: [], attachable: [valeros] });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Detached');
      expect(root.textContent).toContain('Valeros');
      expect(root.querySelector('button[type="submit"]')).not.toBeNull();
    });
    expect(root.ownerDocument.activeElement).toBe(button);
  });
});

describe('CampaignPartyPanel, past the first attach', () => {
  it('keeps the form and its focus after bringing in the last free character', async () => {
    const harness = await open({ characters: [], attachable: [valeros] });
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);

    pick(harness, valeros.characterId);
    const submit = present(root.querySelector<HTMLButtonElement>('button[type="submit"]'));
    submit.focus();
    submit.click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'POST', url: `/api/campaigns/${id}/characters` })
        .flush({ characters: [inParty(valeros, true)], attachable: [] });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Brought in');
      expect(root.textContent).toContain('None of your characters is free to bring.');
    });
    expect(root.ownerDocument.activeElement).toBe(submit);
  });

  it('drops the Detached mark when the character is brought back', async () => {
    const harness = await open({ characters: [inParty(valeros, true)], attachable: [] });
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);

    present(buttons(root, 'Detach')[0]).click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'DELETE', url: `/api/campaigns/${id}/characters/${valeros.characterId}` })
        .flush({ characters: [], attachable: [valeros] });
    });
    await vi.waitFor(() => {
      expect(badges(root)).toContain('Detached');
    });

    pick(harness, valeros.characterId);
    present(root.querySelector<HTMLButtonElement>('button[type="submit"]')).click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'POST', url: `/api/campaigns/${id}/characters` })
        .flush({ characters: [inParty(valeros, true)], attachable: [] });
    });
    await vi.waitFor(() => {
      expect(badges(root)).not.toContain('Detached');
    });
  });

  it('asks to try again when bringing in or detaching fails', async () => {
    const harness = await open({ characters: [inParty(valeros, true)], attachable: [merisiel] });
    const http = TestBed.inject(HttpTestingController);
    const root = present(harness.routeNativeElement);
    const failure = { type: 'internal', title: 'Internal error', status: 500, message: { key: 'problem.internal' } };

    pick(harness, merisiel.characterId);
    present(root.querySelector<HTMLButtonElement>('button[type="submit"]')).click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'POST', url: `/api/campaigns/${id}/characters` })
        .flush(failure, { status: 500, statusText: 'Internal Server Error' });
    });
    present(buttons(root, 'Detach')[0]).click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'DELETE', url: `/api/campaigns/${id}/characters/${valeros.characterId}` })
        .flush(failure, { status: 500, statusText: 'Internal Server Error' });
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Could not bring the character in. Try again.');
      expect(root.textContent).toContain('Could not detach the character. Try again.');
    });
  });
});
