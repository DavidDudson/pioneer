import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { frontierMessages } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import messages from '../../../i18n/en.json';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';
import { CampaignOfferCoins } from './campaign-offer-coins.component';

const campaign = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const kyra = '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e62';
const seelah = '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e63';
const purse = { pp: 1, gp: 10, sp: 5, cp: 0 };

/** A party member played by someone. */
function member(characterId: string, name: string): object {
  return {
    characterId,
    name,
    level: 2,
    ownerId: '1d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e11',
    ownerName: 'Ezren',
    attachedAt: '2026-10-12T10:00:00.000Z',
    detachable: false,
    archived: false,
  };
}

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

/** What a test drives once the control is open. */
interface Opened {
  readonly fixture: ComponentFixture<CampaignOfferCoins>;
  readonly http: HttpTestingController;
  readonly root: HTMLElement;
}

/** Kyra's purse on the sheet of a character in the campaign, with the disclosure opened and the party loaded. */
async function open(characters: readonly object[]): Promise<Opened> {
  TestBed.configureTestingModule({
    providers: [
      ...provideServerStateTesting(),
      provideI18n({ en: async () => ({ ...frontierMessages, campaign: messages }) }),
    ],
  });
  const fixture = TestBed.createComponent(CampaignOfferCoins);
  fixture.componentRef.setInput('campaign', campaign);
  fixture.componentRef.setInput('character', kyra);
  fixture.componentRef.setInput('purse', purse);
  const host: unknown = fixture.nativeElement;
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('The control did not render');
  }
  const root = host;
  document.body.append(root);
  onTestFinished(() => {
    root.remove();
  });
  const http = TestBed.inject(HttpTestingController);
  await fixture.whenStable();
  present(root.querySelector('summary')).click();
  await vi.waitFor(() => {
    http.expectOne(`/api/campaigns/${campaign}/party`).flush({ characters, attachable: [] });
  });
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, http, root };
}

/** Types a count into the field with the label. */
function count(root: HTMLElement, label: string, value: number): void {
  const field = present(root.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`));
  field.value = String(value);
  field.dispatchEvent(new Event('input'));
}

/** The button that makes the offer. */
function submit(root: HTMLElement): HTMLButtonElement {
  return present([...root.querySelectorAll('button')].find((button) => button.textContent.includes('Offer coins to')));
}

describe(CampaignOfferCoins, () => {
  it('offers the counted coins to the character picked from the party, and refreshes the offers', async () => {
    const { fixture, http, root } = await open([member(kyra, 'Kyra'), member(seelah, 'Seelah')]);
    const picker = fixture.debugElement.query((element) => element.componentInstance instanceof Picker)
      .componentInstance as Picker<string, object>;
    picker.value.set(seelah);
    count(root, 'Gold (gp)', 4);
    count(root, 'Silver (sp)', 2);
    fixture.detectChanges();

    submit(root).click();

    await vi.waitFor(() => {
      const request = http.expectOne({ method: 'POST', url: `/api/campaigns/${campaign}/transfers/coins` });
      expect(request.request.body).toStrictEqual({ from: kyra, to: seelah, coins: { pp: 0, gp: 4, sp: 2, cp: 0 } });
      request.flush({
        id: '4c1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e01',
        from: kyra,
        to: seelah,
        coins: { pp: 0, gp: 4, sp: 2, cp: 0 },
        status: 'pending',
      });
    });
  });

  it('offers nothing until a recipient is picked and a coin is counted', async () => {
    const { fixture, root } = await open([member(kyra, 'Kyra'), member(seelah, 'Seelah')]);
    const picker = fixture.debugElement.query((element) => element.componentInstance instanceof Picker)
      .componentInstance as Picker<string, object>;

    picker.value.set(seelah);
    fixture.detectChanges();
    expect(submit(root).disabled).toBe(true);

    count(root, 'Gold (gp)', 1);
    fixture.detectChanges();
    expect(submit(root).disabled).toBe(false);
  });

  it('offers nothing for more of a coin than the purse holds', async () => {
    const { fixture, root } = await open([member(kyra, 'Kyra'), member(seelah, 'Seelah')]);
    const picker = fixture.debugElement.query((element) => element.componentInstance instanceof Picker)
      .componentInstance as Picker<string, object>;
    picker.value.set(seelah);

    count(root, 'Gold (gp)', 11);
    fixture.detectChanges();

    expect(submit(root).disabled).toBe(true);
  });

  it('says so when there is nobody else in the party', async () => {
    const { root } = await open([member(kyra, 'Kyra')]);

    expect(root.textContent).toContain('No other character in the party to offer to.');
  });
});
