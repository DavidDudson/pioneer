import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';

import { CharacterRuleLimitStore } from '../../../data/character-rule-limit-store';
import { CharacterStore } from '../../../data/character-store';
import { INVENTORY_LINE_OFFER } from '../../../data/inventory-line-offer';
import { ItemOffer } from './item-offer.component';

const campaign = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const character = '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e62';
const plain = '3b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e01';
const gmLine = '3b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e02';
const GM_LINK = '9d1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e09';

/** Loads the campaign's control, which the app provides. */
type LoadOffer = () => Promise<Type<unknown>>;

/** Stands in for the campaign's control, which the app provides. */
@Component({
  selector: 'pio-stub-offer',
  templateUrl: './item-offer-stub.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubOffer {
  public readonly campaign = input.required<string>();
  public readonly character = input.required<string>();
  public readonly line = input.required<string>();
  public readonly name = input.required<string>();
}

/** The sheet of a character carrying a plain line and a key item's, in `campaignId` or in none. */
function render(campaignId: string | undefined, loader: LoadOffer, line: string): ComponentFixture<ItemOffer> {
  const items = [
    { id: plain, item: 'rope' },
    { id: gmLine, item: 'sword', keyItem: GM_LINK },
  ];
  TestBed.configureTestingModule({
    providers: [
      { provide: INVENTORY_LINE_OFFER, useValue: loader },
      {
        provide: CharacterStore,
        useValue: { selected: (): object => ({ id: character, document: { inventory: { items } } }) },
      },
      { provide: CharacterRuleLimitStore, useValue: { rules: (): object => ({ campaign: campaignId }) } },
    ],
  });
  const fixture = TestBed.createComponent(ItemOffer);
  fixture.componentRef.setInput('id', line);
  fixture.componentRef.setInput('name', 'Rope');
  fixture.detectChanges();
  return fixture;
}

/** The campaign's control, when the slot shows it. */
function control(fixture: ComponentFixture<ItemOffer>): StubOffer | undefined {
  const found: unknown[] = fixture.debugElement
    .queryAll(By.directive(StubOffer))
    .map((element): unknown => element.componentInstance);
  return found.find((each) => each instanceof StubOffer);
}

describe(ItemOffer, () => {
  it("shows the campaign's control for a line of a character in a campaign, with what it needs", async () => {
    const fixture = render(campaign, async () => StubOffer, plain);

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(control(fixture)).toBeDefined();
    });
    const shown = control(fixture);
    expect([shown?.campaign(), shown?.character(), shown?.line(), shown?.name()]).toStrictEqual([
      campaign,
      character,
      plain,
      'Rope',
    ]);
  });

  it('shows nothing for a key item, which the GM controls', async () => {
    const loader = vi.fn<LoadOffer>(async () => StubOffer);
    const fixture = render(campaign, loader, gmLine);
    await Promise.resolve();
    fixture.detectChanges();

    expect(control(fixture)).toBeUndefined();
    expect(loader).not.toHaveBeenCalled();
  });

  it('shows nothing, and loads nothing, outside a campaign', async () => {
    const loader = vi.fn<LoadOffer>(async () => StubOffer);
    const fixture = render(undefined, loader, plain);
    await Promise.resolve();
    fixture.detectChanges();

    expect(control(fixture)).toBeUndefined();
    expect(loader).not.toHaveBeenCalled();
  });
});
