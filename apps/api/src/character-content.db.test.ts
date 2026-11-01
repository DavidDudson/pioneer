import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CampaignPackId } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignMemberId } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { DrizzleCampaignPackRepository, DrizzleCampaignRepository } from '@pioneer/campaign/infrastructure';
import { CharacterContent, CharacterPackService, HeldContentPacks } from '@pioneer/character/application';
import type { EffectiveVariants } from '@pioneer/character/application';
import { CharacterCommand } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { DrizzleCharacterPackRepository, DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { PackAccessPolicy } from '@pioneer/homebrew/application';
import { DrizzlePackDependencyRepository, DrizzlePackDirectory } from '@pioneer/homebrew/infrastructure';
import { ContentRepository, seedContentPacks, StoredContentSource } from '@pioneer/rules/infrastructure';
import {
  AncestryId,
  ContentId,
  contentId,
  contentPackId,
  EntrySlug,
  packContentsFromFiles,
  PackId,
} from '@pioneer/rules/sdk';
import type { ContentPackId, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { CampaignPackDirectory } from './attached-campaign-pack-directory';
import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import { HomebrewPackCatalog } from './homebrew-pack-catalog';
import { StoredPackLookup } from './stored-pack-lookup';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-15T10:00:00Z');
const at = clock.now().toString();

const CORE = 'registry-core';
const TABLE = 'registry-table';
const SHELVED = 'registry-shelved';
const HIDDEN = 'registry-hidden';
const [core, table, shelved, hidden] = [CORE, TABLE, SHELVED, HIDDEN].map((pack) =>
  contentPackId(PackId.parse(pack)),
) as [ContentPackId, ContentPackId, ContentPackId, ContentPackId];

function entryId(pack: string): ContentId {
  return ContentId.parse(contentId(PackId.parse(pack), EntrySlug.parse(`ancestry:${pack}`)));
}

function ancestryPack(pack: string, license: string): PackContents {
  const file = { id: pack, title: pack, publisher: 'Pioneer', license };
  const entry = {
    id: entryId(pack),
    pack,
    kind: 'ancestry',
    slug: `ancestry:${pack}`,
    name: pack,
    rarity: 'common',
    traits: [pack],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description: [],
    rules: [],
    data: {
      hitPoints: 10,
      size: 'medium',
      speed: 25,
      boosts: [['str'], ['str', 'dex', 'con', 'int', 'wis', 'cha']],
      flaws: [],
      languages: [],
      additionalLanguages: { count: 0, options: [] },
      reach: 5,
    },
  };
  return packContentsFromFiles(file, [[entry]]);
}

function loader(contents: PackContents): PackContentsLoader {
  return { id: contents.file.id, load: async () => contents };
}

const noVariants: EffectiveVariants = { of: async () => [] };

describe.skipIf(adminUrl === undefined)('CharacterContent over postgres', () => {
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let packs: CharacterPackService;
  let content: CharacterContent;
  let campaignId: CampaignId;
  let memberId: CampaignMemberId;
  let holdsShelved: Character;
  let holdsHidden: Character;

  /** The ids of the packs in `character`'s registry among those this test seeds. */
  async function registryOf(character: Character): Promise<readonly ContentPackId[]> {
    const registry = await content.forCharacter(character).registry();
    return registry.packs
      .map((pack) => contentPackId(pack.id))
      .filter((id) => [core, table, shelved, hidden].includes(id));
  }

  async function attach(character: Character): Promise<void> {
    await database.db.execute(
      sql`insert into campaign_characters (id, campaign_id, member_id, character_id, attached_at) values (${newId()}, ${campaignId}, ${memberId}, ${character.id}, ${at})`,
    );
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    await Promise.all(
      [amiri, ezren].map(async (user) =>
        database.db.execute(
          sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${user}, 'User', false, ${at}, ${at})`,
        ),
      ),
    );
    await seedContentPacks(
      database.db,
      [
        loader(ancestryPack(CORE, 'ORC')),
        loader(ancestryPack(TABLE, 'homebrew')),
        loader(ancestryPack(SHELVED, 'homebrew')),
        loader(ancestryPack(HIDDEN, 'homebrew')),
      ],
      clock,
    );
    await database.db.execute(
      sql`update content_packs set owner_id = ${ezren}, visibility = 'campaign' where id = ${table}`,
    );
    await database.db.execute(
      sql`update content_packs set owner_id = ${amiri}, visibility = 'private' where id = ${shelved}`,
    );
    await database.db.execute(
      sql`update content_packs set owner_id = ${ezren}, visibility = 'private' where id = ${hidden}`,
    );

    const repository = new DrizzleCharacterRepository(database.db);
    const build = async (name: string, held: string): Promise<Character> => {
      const character = new CharacterBuilder()
        .named(name)
        .ownedBy(amiri)
        .withAncestry(AncestryId.parse(entryId(held)))
        .build();
      await repository.insert(character, { actor: amiri, command: CharacterCommand.CreateCharacter });
      return character;
    };
    holdsShelved = await build('Shelved', SHELVED);
    holdsHidden = await build('Hidden', HIDDEN);

    const campaigns = new DrizzleCampaignRepository(database.db);
    const campaign = await campaigns.insert(
      new CampaignBuilder().named('Abomination Vaults').ranBy(ezren).withPlayer(amiri).build(),
    );
    campaignId = campaign.id;
    const member = campaign.members.find((candidate) => candidate.userId === amiri);
    if (member === undefined) {
      throw new Error('Amiri is not in the campaign');
    }
    memberId = member.id;
    await new DrizzleCampaignPackRepository(database.db).enable(
      ezren,
      {
        campaignId,
        packs: [{ id: CampaignPackId.parse(newId()), packId: table, enabledBy: ezren, enabledAt: clock.now() }],
      },
      async () => {},
    );

    const source = new StoredContentSource(new ContentRepository(database.db));
    const catalog = new HomebrewPackCatalog(
      new DrizzlePackDirectory(database.db),
      new DrizzlePackDependencyRepository(database.db),
      new PackAccessPolicy(new CampaignPackEnablementDirectory(database.db)),
    );
    const held = new HeldContentPacks(new StoredPackLookup(source), catalog);
    packs = new CharacterPackService(
      {
        characters: repository,
        packs: new DrizzleCharacterPackRepository(database.db),
        catalog,
        campaigns: new CampaignPackDirectory(database.db),
        held,
      },
      clock,
    );
    content = new CharacterContent(source, packs, { variants: noVariants, held });
  });

  afterAll(async () => {
    await database.drop();
  });

  test('outside a campaign, a pack the owner enabled is in force and nothing is unsupported', async () => {
    await packs.enable(amiri, holdsShelved.id, { packId: shelved });

    expect(await registryOf(holdsShelved)).toContain(shelved);
    expect(await content.unsupportedPacks(holdsShelved)).toStrictEqual([]);
  });

  test('in a campaign, its packs are in force and a disabled pack the character holds from stays, unsupported', async () => {
    await attach(holdsShelved);

    const registry = await registryOf(holdsShelved);
    expect(registry).toContain(core);
    expect(registry).toContain(table);
    expect(registry).toContain(shelved);
    expect(registry).not.toContain(hidden);
    expect(await content.unsupportedPacks(holdsShelved)).toStrictEqual([shelved]);
  });

  test('a private pack its owner can no longer read is left out, though the character holds from it', async () => {
    await attach(holdsHidden);

    const registry = await registryOf(holdsHidden);
    expect(registry).toContain(table);
    expect(registry).not.toContain(hidden);
    expect(await content.unsupportedPacks(holdsHidden)).toStrictEqual([]);
  });
});
