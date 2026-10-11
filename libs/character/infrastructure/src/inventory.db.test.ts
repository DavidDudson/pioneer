import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CharacterService } from '@pioneer/character/application';
import {
  CarryState,
  CharacterCommand,
  CharacterName,
  CharacterPatchField,
  CoinsSchema,
  CURRENT_SCHEMA_VERSION,
  ItemQuantity,
  ItemRunesSchema,
} from '@pioneer/character/domain';
import type { Character, InventoryItem } from '@pioneer/character/domain';
import {
  fixtureOwnerId,
  fundamental,
  humanAncestryId,
  ITEM_FIXTURES,
  ItemFixture,
  itemFixtureId,
  propertyRune,
  RuneFixture,
  runeFixtureId,
} from '@pioneer/character/domain/testing';
import { FundamentalRune } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock } from '@pioneer/shared/kernel';
import { auditLog } from '@pioneer/shared/server';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { asc, eq, sql } from 'drizzle-orm';

import { characters } from './character.table';
import { DrizzleCharacterRepository } from './drizzle-character-repository';

/** Inventory edits against a throwaway Postgres database; skipped when TEST_DATABASE_URL is unset. */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-07T10:00:00Z');
const one = ItemQuantity.parse(1);

/** The one item `character` carries. */
function onlyItem(character: Character): InventoryItem {
  const [item, ...rest] = character.document.inventory.items;
  if (item === undefined || rest.length > 0) {
    throw new Error('Expected one item');
  }
  return item;
}

describe.skipIf(adminUrl === undefined)('inventory edits (postgres)', () => {
  let database: TestDatabase;
  let service: CharacterService;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    const at = clock.now().toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureOwnerId}, 'Owner', false, ${at}, ${at})`,
    );
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    service = new CharacterService(
      new DrizzleCharacterRepository(database.db),
      fixedContent(core, ITEM_FIXTURES),
      clock,
    );
  });

  afterAll(async () => {
    await database.drop();
  });

  test('stores items in containers and coins, read back as written and audited by command', async () => {
    const created = await service.create(fixtureOwnerId, {
      name: CharacterName.parse('Merisiel'),
      ancestry: humanAncestryId,
    });
    const { character: packed } = await service.patch(fixtureOwnerId, created.id, {
      expectedVersion: FIRST_VERSION,
      patch: { field: CharacterPatchField.GiftItem, item: itemFixtureId(ItemFixture.Backpack), quantity: one },
    });
    const [backpack] = packed.document.inventory.items;
    const { character: stowed } = await service.patch(fixtureOwnerId, created.id, {
      expectedVersion: packed.version,
      patch: {
        field: CharacterPatchField.GiftItem,
        item: itemFixtureId(ItemFixture.Rope),
        quantity: one,
        container: backpack?.id,
      },
    });
    const coins = CoinsSchema.parse({ gp: 15, cp: 7 });
    await service.patch(fixtureOwnerId, created.id, {
      expectedVersion: stowed.version,
      patch: { field: CharacterPatchField.SetCoins, coins },
    });

    const stored = await service.get(fixtureOwnerId, created.id);
    expect(stored.document.inventory.items.map((each) => [each.item, each.container])).toStrictEqual([
      [itemFixtureId(ItemFixture.Backpack), undefined],
      [itemFixtureId(ItemFixture.Rope), backpack?.id],
    ]);
    expect(stored.document.inventory.coins).toStrictEqual(coins);

    const [row] = await database.db
      .select({ schemaVersion: characters.schemaVersion })
      .from(characters)
      .where(eq(characters.id, created.id));
    expect(row?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const entries = await database.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.rowId, created.id))
      .orderBy(asc(auditLog.changedAt));
    expect(entries.map((entry) => entry.command)).toStrictEqual([
      CharacterCommand.CreateCharacter,
      CharacterCommand.GiftItem,
      CharacterCommand.GiftItem,
      CharacterCommand.SetCoins,
    ]);
  });

  test('stores how items are carried and what is invested, read back as written', async () => {
    const created = await service.create(fixtureOwnerId, {
      name: CharacterName.parse('Seelah'),
      ancestry: humanAncestryId,
    });
    const { character: added } = await service.patch(fixtureOwnerId, created.id, {
      expectedVersion: FIRST_VERSION,
      patch: { field: CharacterPatchField.GiftItem, item: itemFixtureId(ItemFixture.Cloak), quantity: one },
    });
    const cloak = onlyItem(added);
    const worn = { state: CarryState.Worn } as const;
    const { character: wearing } = await service.patch(fixtureOwnerId, created.id, {
      expectedVersion: added.version,
      patch: { field: CharacterPatchField.CarryItem, id: cloak.id, carry: worn },
    });
    await service.patch(fixtureOwnerId, created.id, {
      expectedVersion: wearing.version,
      patch: { field: CharacterPatchField.InvestItem, id: cloak.id, invested: true },
    });

    const stored = await service.get(fixtureOwnerId, created.id);
    expect(stored.document.inventory.items).toStrictEqual([{ ...cloak, carry: worn, invested: true }]);
  });

  test('stores the runes etched onto an item, read back as written', async () => {
    const created = await service.create(fixtureOwnerId, {
      name: CharacterName.parse('Valeros'),
      ancestry: humanAncestryId,
    });
    const { character: added } = await service.patch(fixtureOwnerId, created.id, {
      expectedVersion: FIRST_VERSION,
      patch: { field: CharacterPatchField.GiftItem, item: itemFixtureId(ItemFixture.Longsword), quantity: one },
    });
    const sword = onlyItem(added);
    const { character: potent } = await service.patch(fixtureOwnerId, created.id, {
      expectedVersion: added.version,
      patch: { field: CharacterPatchField.EtchRune, id: sword.id, rune: fundamental(FundamentalRune.Potency, 1) },
    });
    await service.patch(fixtureOwnerId, created.id, {
      expectedVersion: potent.version,
      patch: { field: CharacterPatchField.EtchRune, id: sword.id, rune: propertyRune(RuneFixture.Flaming) },
    });

    const stored = await service.get(fixtureOwnerId, created.id);
    expect(onlyItem(stored).runes).toStrictEqual(
      ItemRunesSchema.parse({ potency: 1, property: [runeFixtureId(RuneFixture.Flaming)] }),
    );
  });
});
