import { TestBed } from '@angular/core/testing';
import {
  activationUseKey,
  addItem,
  carryItem,
  CarryState,
  Character,
  EMPTY_INVENTORY,
  Hands,
  InventoryItemId,
  ItemQuantity,
  ResourcesSpentSchema,
} from '@pioneer/character/domain';
import type { Inventory } from '@pioneer/character/domain';
import { CharacterBuilder, ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ActionStatus } from '@pioneer/rules/engine';
import { Slug } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { ActionResourceKind } from '@pioneer/rules/ui';
import type { ActionLine } from '@pioneer/rules/ui';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { ACTION_CONTENT_KINDS } from './sheet-actions';
import { statisticInputsOf } from './sheet-inputs';
import { sheetItemActions } from './sheet-item-actions';

const POTION = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');
const BOOTS = InventoryItemId.parse('22222222-2222-4222-8222-222222222222');
const STAFF = InventoryItemId.parse('33333333-3333-4333-8333-333333333333');
const SKIES = Slug.parse('take-to-the-skies');
const HANDS_ONE = Hands.parse(1);

interface Carried {
  readonly id: InventoryItemId;
  readonly fixture: ItemFixture;
  readonly quantity?: number;
  readonly carry?: CarryState;
}

function carrying(...items: readonly Carried[]): Character {
  const built = new CharacterBuilder().build();
  let inventory: Inventory = EMPTY_INVENTORY;
  for (const { id, fixture, quantity = 1, carry = CarryState.Worn } of items) {
    const added = addItem(inventory, {
      id,
      item: itemFixtureId(fixture),
      quantity: ItemQuantity.parse(quantity),
      container: undefined,
    });
    inventory = carryItem(added, id, carry === CarryState.Held ? { state: carry, hands: HANDS_ONE } : { state: carry });
  }
  return new Character({
    document: { ...built.document, inventory },
    version: built.version,
    createdAt: built.createdAt,
    updatedAt: built.updatedAt,
  });
}

async function registryWithItems(): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting([ITEM_FIXTURE_FILES]) });
  return TestBed.inject(ContentLoader).registry(ACTION_CONTENT_KINDS);
}

function listed(registry: ContentRegistry, character: Character, spent: object = {}): readonly ActionLine[] {
  return sheetItemActions(registry, character, {
    resources: ResourcesSpentSchema.parse(spent),
    turn: undefined,
    inputs: statisticInputsOf(registry, character),
  });
}

describe(sheetItemActions, () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  describe('a consumable', () => {
    it('is a row with its stack as the resource, spent as the item', async () => {
      const registry = await registryWithItems();
      const lines = listed(registry, carrying({ id: POTION, fixture: ItemFixture.HealingPotion, quantity: 2 }));

      expect(lines).toMatchObject([
        {
          name: 'Healing-potion',
          status: ActionStatus.Available,
          resource: { kind: ActionResourceKind.Quantity, current: 2 },
          payment: { consumable: POTION },
          origin: { kind: 'item' },
        },
      ]);
    });

    it('is not listed once dropped', async () => {
      const registry = await registryWithItems();
      const lines = listed(
        registry,
        carrying({ id: POTION, fixture: ItemFixture.HealingPotion, carry: CarryState.Dropped }),
      );

      expect(lines).toStrictEqual([]);
    });
  });

  describe('an item with a daily activation', () => {
    it('is a row with the uses it has left, spent under the activation key', async () => {
      const registry = await registryWithItems();
      const lines = listed(registry, carrying({ id: BOOTS, fixture: ItemFixture.WingedBoots }));

      expect(lines).toMatchObject([
        {
          name: 'Winged-boots: Take to the Skies',
          cost: 'two',
          status: ActionStatus.Available,
          resource: { kind: ActionResourceKind.Uses, current: 1, max: 1 },
          payment: { use: activationUseKey(BOOTS, SKIES) },
        },
      ]);
    });

    it('is unusable, with the reason, when the day’s uses are spent', async () => {
      const registry = await registryWithItems();
      const spent = { uses: { [activationUseKey(BOOTS, SKIES)]: 1 } };
      const lines = listed(registry, carrying({ id: BOOTS, fixture: ItemFixture.WingedBoots }), spent);

      expect(lines).toMatchObject([
        {
          status: ActionStatus.Unavailable,
          resource: { current: 0, max: 1 },
          reasons: [{ key: 'character.sheet.itemActions.noUses' }],
        },
      ]);
    });

    it('is unusable, with the reason, while stowed', async () => {
      const registry = await registryWithItems();
      const lines = listed(
        registry,
        carrying({ id: BOOTS, fixture: ItemFixture.WingedBoots, carry: CarryState.Stowed }),
      );

      expect(lines).toMatchObject([
        { status: ActionStatus.Unavailable, reasons: [{ key: 'character.sheet.itemActions.stowed' }] },
      ]);
    });
  });

  describe('a staff', () => {
    it('gives a row for each spell, with the charges the staff has left', async () => {
      const registry = await registryWithItems();
      const lines = listed(registry, carrying({ id: STAFF, fixture: ItemFixture.FireStaff, carry: CarryState.Held }), {
        staff: { [STAFF]: { max: 4, spent: 1 } },
      });

      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line.resource).toStrictEqual({ kind: ActionResourceKind.Charges, current: 3, max: 4 });
        expect(line.payment?.staff?.item).toBe(STAFF);
      }
    });

    it('is unusable, with the reason, when it is not the staff prepared for the day', async () => {
      const registry = await registryWithItems();
      const lines = listed(registry, carrying({ id: STAFF, fixture: ItemFixture.FireStaff, carry: CarryState.Held }));

      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line).toMatchObject({
          status: ActionStatus.Unavailable,
          resource: { current: 0 },
          reasons: [{ key: 'character.sheet.itemActions.notPrepared' }],
        });
      }
    });
  });
});
