import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';

import { CharacterRuleLimitStore } from '../../../data/character-rule-limit-store';
import { CharacterStore } from '../../../data/character-store';
import { PARTY_INVENTORY } from '../../../data/party-inventory';
import { PartyInventory } from './party-inventory.component';

const campaign = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const character = '2a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e62';
const rope = '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e01';
const pack = '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e02';
const inPack = '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e03';
const granted = '4a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e05';
const sunblade = '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e04';

/** A line the stub character carries. */
interface Line {
  readonly id: string;
  readonly container?: string;
  readonly keyItem?: string;
}

/** Loads the campaign's container, which the app provides. */
type LoadContainer = () => Promise<Type<unknown>>;

/** A line the container is handed. */
interface Handed {
  readonly id: string;
  readonly name: string;
}

/** Stands in for the campaign's container, which the app provides. */
@Component({
  selector: 'pio-stub-party-inventory',
  templateUrl: './party-inventory-stub.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubPartyInventory {
  public readonly campaign = input.required<string>();
  public readonly character = input.required<string>();
  public readonly lines = input.required<readonly Handed[]>();
}

const carried: readonly Line[] = [
  { id: rope },
  { id: pack },
  { id: inPack, container: pack },
  { id: sunblade, keyItem: granted },
];

const names = new Map([
  [rope, 'Rope'],
  [pack, 'Backpack'],
  [inPack, 'Torch'],
  [sunblade, 'Sunblade'],
]);

/** The sheet of a character carrying `items`, in `campaignId` or in none. */
function render(campaignId: string | undefined, loader: LoadContainer): ComponentFixture<PartyInventory> {
  TestBed.configureTestingModule({
    providers: [
      { provide: PARTY_INVENTORY, useValue: loader },
      {
        provide: CharacterStore,
        useValue: { selected: (): object => ({ id: character, document: { inventory: { items: carried } } }) },
      },
      { provide: CharacterRuleLimitStore, useValue: { rules: (): object => ({ campaign: campaignId }) } },
    ],
  });
  const fixture = TestBed.createComponent(PartyInventory);
  fixture.componentRef.setInput('names', names);
  fixture.detectChanges();
  return fixture;
}

/** The campaign's container, when the slot shows it. */
function container(fixture: ComponentFixture<PartyInventory>): StubPartyInventory | undefined {
  const found: unknown[] = fixture.debugElement
    .queryAll(By.directive(StubPartyInventory))
    .map((element): unknown => element.componentInstance);
  return found.find((each) => each instanceof StubPartyInventory);
}

describe(PartyInventory, () => {
  it('shows the container for a character in a campaign, handing it the loose lines that are not key items', async () => {
    const fixture = render(campaign, async () => StubPartyInventory);

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(container(fixture)).toBeDefined();
    });
    const shown = container(fixture);
    expect([shown?.campaign(), shown?.character(), shown?.lines()]).toStrictEqual([
      campaign,
      character,
      [
        { id: rope, name: 'Rope' },
        { id: pack, name: 'Backpack' },
      ],
    ]);
  });

  it('shows nothing, and loads nothing, for a character in no campaign', () => {
    const loader = vi.fn<LoadContainer>(async () => StubPartyInventory);
    const fixture = render(undefined, loader);

    expect(container(fixture)).toBeUndefined();
    expect(loader).not.toHaveBeenCalled();
  });

  it('shows nothing when the container fails to load', async () => {
    const loader = vi.fn<LoadContainer>(async () => {
      throw new Error('offline');
    });
    const fixture = render(campaign, loader);

    await vi.waitFor(() => {
      expect(loader).toHaveBeenCalledWith();
    });
    fixture.detectChanges();
    expect(container(fixture)).toBeUndefined();
  });
});
