import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { CharacterId, CreateKeyItemBody, KeyItemId } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignKeyItem } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { DrizzleCampaignKeyItemRepository, DrizzleCampaignRepository } from '@pioneer/campaign/infrastructure';
import { CharacterKeyItems } from '@pioneer/character/application';
import { CharacterCommand } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { lineOf } from './character-key-item-holders';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-17T10:00:00Z');
const at = clock.now().toString();

/** Caliburn: a longsword with six property runes, one more than the table allows. */
const stated = CreateKeyItemBody.parse({
  name: 'Caliburn',
  base: { item: newId(), name: 'Longsword' },
  runes: {
    potency: 3,
    property: ['Flaming', 'Frost', 'Shock', 'Corrosive', 'Ghost Touch', 'Grievous'].map((name) => ({
      rune: newId(),
      name,
    })),
  },
  notes: 'Drawn from the stone.',
});

function keyItem(overrides: Partial<CampaignKeyItem> = {}): CampaignKeyItem {
  return { id: KeyItemId.parse(newId()), ...stated, holder: undefined, createdAt: clock.now(), ...overrides };
}

describe.skipIf(adminUrl === undefined)('campaign key items over postgres', () => {
  const recorder = new QueryRecorder();
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleCampaignKeyItemRepository;
  let characters: DrizzleCharacterRepository;
  let kyra: Character;
  let campaignId: CampaignId;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    await Promise.all(
      [amiri, ezren].map(async (user) =>
        database.db.execute(
          sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${user}, 'User', false, ${at}, ${at})`,
        ),
      ),
    );
    characters = new DrizzleCharacterRepository(database.db);
    kyra = new CharacterBuilder().named('Kyra').ownedBy(amiri).build();
    await characters.insert(kyra, { actor: amiri, command: CharacterCommand.CreateCharacter });
    repository = new DrizzleCampaignKeyItemRepository(database.db);
  });

  /** A fresh campaign for each test, as key items are never deleted. */
  beforeEach(async () => {
    const campaign = await new DrizzleCampaignRepository(database.db).insert(
      new CampaignBuilder().named('Abomination Vaults').ranBy(ezren).withPlayer(amiri).build(),
    );
    campaignId = campaign.id;
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a key item keeps its runes as stated, past the table’s cap, and starts in the stash', async () => {
    const made = keyItem();
    await repository.insert(ezren, campaignId, made);

    const [row] = await repository.listForCampaign(campaignId);

    expect(row).toStrictEqual(made);
    expect(row?.runes.property).toHaveLength(6);
  });

  test('giving, moving and taking back change the holder; the list is oldest first', async () => {
    const first = keyItem();
    const second = keyItem({ createdAt: clock.now().add({ minutes: 1 }) });
    await repository.insert(ezren, campaignId, second);
    await repository.insert(ezren, campaignId, first);

    await repository.setHolder(ezren, campaignId, { id: first.id, holder: kyra.id });
    const held = await repository.listForCampaign(campaignId);
    await repository.setHolder(ezren, campaignId, { id: first.id, holder: undefined });
    const back = await repository.listForCampaign(campaignId);

    expect(held.map((row) => [row.id, row.holder])).toStrictEqual([
      [first.id, kyra.id],
      [second.id, undefined],
    ]);
    expect(back.map((row) => row.holder)).toStrictEqual([undefined, undefined]);
  });

  test('archiving keeps the row and who held it; no read sees it', async () => {
    const made = keyItem();
    await repository.insert(ezren, campaignId, made);
    await repository.setHolder(ezren, campaignId, { id: made.id, holder: kyra.id });

    await repository.archive(ezren, campaignId, { id: made.id, at: clock.now() });
    await repository.archive(ezren, campaignId, { id: made.id, at: clock.now() });

    expect(await repository.listForCampaign(campaignId)).toStrictEqual([]);
    const kept = await database.db.execute(
      sql`select holder_id, archived_at from campaign_key_items where id = ${made.id}`,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0]?.holder_id).toBe(kyra.id);
  });

  test('the database refuses to delete a key item (ADR-0062)', async () => {
    await repository.insert(ezren, campaignId, keyItem());

    const error = await rejection(
      database.db.execute(sql`delete from campaign_key_items where campaign_id = ${campaignId}`),
    );

    expect(error).toBeInstanceOf(Error);
  });

  test('a holder must be a character that exists', async () => {
    const stranger = keyItem({ holder: CharacterId.parse(newId()) });
    const error = await rejection(repository.insert(ezren, campaignId, stranger));

    expect(error).toBeInstanceOf(Error);
  });

  test('the line written into a character’s inventory survives a round trip through the database', async () => {
    const made = keyItem();
    await new CharacterKeyItems(characters, clock).give(ezren, kyra.id, lineOf(made));

    const stored = await characters.findById(kyra.id);
    const items = stored?.document.inventory.items;

    expect(items?.map((each) => [each.keyItem, each.name, each.runes?.property.length])).toStrictEqual([
      [made.id, 'Caliburn', 6],
    ]);
  });

  test('every lookup is served by an index', async () => {
    await repository.insert(ezren, campaignId, keyItem());
    await repository.listForCampaign(campaignId);
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
