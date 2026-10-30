import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';

import { CharacterRuleLimitStore } from '../../../data/character-rule-limit-store';
import { CharacterStore } from '../../../data/character-store';
import { PURSE_OFFER } from '../../../data/purse-offer';
import { CoinOffer } from './coin-offer.component';

const campaign = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const character = '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e62';

/** The coins a character holds. */
interface Coins {
  readonly pp: number;
  readonly gp: number;
  readonly sp: number;
  readonly cp: number;
}

const held: Coins = { pp: 0, gp: 10, sp: 0, cp: 0 };
const empty: Coins = { pp: 0, gp: 0, sp: 0, cp: 0 };

/** Loads the campaign's control, which the app provides. */
type LoadOffer = () => Promise<Type<unknown>>;

/** Stands in for the campaign's control, which the app provides. */
@Component({
  selector: 'pio-stub-coin-offer',
  templateUrl: './coin-offer-stub.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubCoinOffer {
  public readonly campaign = input.required<string>();
  public readonly character = input.required<string>();
  public readonly purse = input.required<Coins>();
}

/** The sheet of a character holding `coins`, in `campaignId` or in none. */
function render(campaignId: string | undefined, loader: LoadOffer, coins: Coins): ComponentFixture<CoinOffer> {
  TestBed.configureTestingModule({
    providers: [
      { provide: PURSE_OFFER, useValue: loader },
      {
        provide: CharacterStore,
        useValue: { selected: (): object => ({ id: character, document: { inventory: { coins } } }) },
      },
      { provide: CharacterRuleLimitStore, useValue: { rules: (): object => ({ campaign: campaignId }) } },
    ],
  });
  const fixture = TestBed.createComponent(CoinOffer);
  fixture.detectChanges();
  return fixture;
}

/** The campaign's control, when the slot shows it. */
function control(fixture: ComponentFixture<CoinOffer>): StubCoinOffer | undefined {
  const found: unknown[] = fixture.debugElement
    .queryAll(By.directive(StubCoinOffer))
    .map((element): unknown => element.componentInstance);
  return found.find((each) => each instanceof StubCoinOffer);
}

describe(CoinOffer, () => {
  it("shows the campaign's control for the purse of a character in a campaign, with what it needs", async () => {
    const fixture = render(campaign, async () => StubCoinOffer, held);

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(control(fixture)).toBeDefined();
    });
    const shown = control(fixture);
    expect([shown?.campaign(), shown?.character(), shown?.purse()]).toStrictEqual([campaign, character, held]);
  });

  it('shows nothing, and loads nothing, for an empty purse', async () => {
    const loader = vi.fn<LoadOffer>(async () => StubCoinOffer);
    const fixture = render(campaign, loader, empty);
    await Promise.resolve();
    fixture.detectChanges();

    expect(control(fixture)).toBeUndefined();
    expect(loader).not.toHaveBeenCalled();
  });

  it('shows nothing, and loads nothing, outside a campaign', async () => {
    const loader = vi.fn<LoadOffer>(async () => StubCoinOffer);
    const fixture = render(undefined, loader, held);
    await Promise.resolve();
    fixture.detectChanges();

    expect(control(fixture)).toBeUndefined();
    expect(loader).not.toHaveBeenCalled();
  });
});
