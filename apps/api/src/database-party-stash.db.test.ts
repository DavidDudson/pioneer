import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import type { StashLineMove } from '@pioneer/campaign/application';
import { CharacterId as CampaignCharacterId, PartyStashDocument, ReviewedItemId } from '@pioneer/campaign/domain';
import type { CampaignId } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { DrizzleCampaignRepository, DrizzlePartyStashRepository } from '@pioneer/campaign/infrastructure';
import {
  CharacterCommand,
  CoinsSchema,
  EMPTY_INVENTORY,
  InventoryItemId,
  ItemQuantity,
  STOWED,
} from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, nextVersion, UserId, VersionConflictError } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { DatabasePartyStash } from './database-party-stash';

/** The line `line` of `character`, as the campaign context names a move. */
function move(character: Character, line: InventoryItemId): StashLineMove {
  return { character: CampaignCharacterId.parse(character.id), item: ReviewedItemId.parse(line) };
}

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-20T10:00:00Z');
const at = clock.now().toString();
const ROPE_QUANTITY = ItemQuantity.parse(1);

describe.skipIf(adminUrl === undefined)('the party stash over postgres', () => {
  const amiri = UserId.parse(newId());
  let database: TestDatabase;
  let characters: DrizzleCharacterRepository;
  let stashes: DrizzlePartyStashRepository;
  let keeper: DatabasePartyStash;
  let campaignId: CampaignId;
  let campaignCount = 0;
  let characterCount = 0;

  /** A character owned by Amiri holding a rope on `rope`. */
  async function characterWithRope(rope: InventoryItemId): Promise<Character> {
    const built = new CharacterBuilder()
      .named(`Hero ${(characterCount += 1)}`)
      .ownedBy(amiri)
      .build();
    const stocked = built.withInventory(
      {
        items: [{ id: rope, item: itemFixtureId(ItemFixture.Rope), quantity: ROPE_QUANTITY, carry: STOWED }],
        customItems: [],
        coins: CoinsSchema.parse({}),
      },
      built.updatedAt,
    );
    return characters.insert(stocked, { actor: amiri, command: CharacterCommand.CreateCharacter });
  }

  async function reloaded(character: Character): Promise<Character> {
    const found = await characters.findById(character.id);
    if (found === undefined) {
      throw new Error('The character is gone');
    }
    return found;
  }

  /** The stash's version, which the test expects to exist. */
  async function stashVersion(): Promise<Version> {
    const stored = await stashes.load(campaignId);
    if (stored === undefined) {
      throw new Error('The stash was never made');
    }
    return stored.version;
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${amiri}, 'User', false, ${at}, ${at})`,
    );
    characters = new DrizzleCharacterRepository(database.db);
    stashes = new DrizzlePartyStashRepository(database.db, clock);
    keeper = new DatabasePartyStash(database.db, fixedContent(), clock);
  });

  /** A fresh campaign for each test: the stash is one row per campaign. */
  beforeEach(async () => {
    campaignCount += 1;
    const campaign = await new DrizzleCampaignRepository(database.db).insert(
      new CampaignBuilder().named(`Abomination Vaults ${campaignCount}`).ranBy(amiri).build(),
    );
    campaignId = campaign.id;
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a stash nothing was put in is empty and has no row', async () => {
    expect(await keeper.view(campaignId, [])).toStrictEqual({ lines: [] });
    expect(await stashes.load(campaignId)).toBeUndefined();
  });

  test('a deposit makes the stash at version 1 and a take empties it, each writing the character in step', async () => {
    const rope = InventoryItemId.parse(newId());
    const hero = await characterWithRope(rope);

    const deposited = await keeper.deposit(amiri, campaignId, move(hero, rope));

    const afterDeposit = await reloaded(hero);
    const stored = await stashVersion();
    expect(deposited.lines.map((line) => line.id)).toStrictEqual([rope]);
    expect(afterDeposit.document.inventory.items).toStrictEqual([]);
    expect(afterDeposit.version).toBe(nextVersion(hero.version));
    expect(Number(stored)).toBe(1);

    const taken = await keeper.take(amiri, campaignId, move(hero, rope));

    const afterTake = await reloaded(hero);
    const emptied = await stashVersion();
    expect(taken.lines).toStrictEqual([]);
    expect(afterTake.document.inventory.items.map((line) => line.id)).toStrictEqual([rope]);
    expect(afterTake.version).toBe(nextVersion(afterDeposit.version));
    expect(emptied).toBe(nextVersion(stored));
  });

  test('a take of a line the stash lacks is a not-found and writes nothing', async () => {
    const rope = InventoryItemId.parse(newId());
    const hero = await characterWithRope(rope);

    const failed = await rejection(keeper.take(amiri, campaignId, move(hero, rope)));

    expect(failed).toMatchObject({ name: 'NotFoundError' });
    expect(await stashes.load(campaignId)).toBeUndefined();
    const unchanged = await reloaded(hero);
    expect(unchanged.version).toBe(hero.version);
  });

  test('a stash saved by someone else since it was read fails the save with a version conflict', async () => {
    const actor = amiri;
    const document = PartyStashDocument.parse(EMPTY_INVENTORY);
    await stashes.save(actor, { campaignId, document, expected: undefined });
    const read = await stashes.load(campaignId);
    await stashes.save(actor, { campaignId, document, expected: read?.version });

    const stale = await rejection(stashes.save(actor, { campaignId, document, expected: read?.version }));
    const recreated = await rejection(stashes.save(actor, { campaignId, document, expected: undefined }));

    expect(stale).toBeInstanceOf(VersionConflictError);
    expect(recreated).toBeInstanceOf(VersionConflictError);
  });

  test('two deposits racing into a stash not yet made leave one winner, and the loser keeps its line', async () => {
    const [first, second] = [InventoryItemId.parse(newId()), InventoryItemId.parse(newId())];
    const heroes = await Promise.all([characterWithRope(first), characterWithRope(second)]);

    const settled = await Promise.allSettled([
      keeper.deposit(amiri, campaignId, move(heroes[0], first)),
      keeper.deposit(amiri, campaignId, move(heroes[1], second)),
    ]);

    const stored = await stashVersion();
    const after = await Promise.all(heroes.map(async (hero) => reloaded(hero)));
    const lost = settled.filter((each) => each.status === 'rejected');
    expect(lost).toHaveLength(1);
    expect(lost[0]?.reason).toBeInstanceOf(VersionConflictError);
    expect(Number(stored)).toBe(1);
    expect(
      after.map((hero) => hero.document.inventory.items.length).toSorted((left, right) => left - right),
    ).toStrictEqual([0, 1]);
  });
});
