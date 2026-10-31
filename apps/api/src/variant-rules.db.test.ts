import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { CampaignVariantService } from '@pioneer/campaign/application';
import { EnabledVariantRuleId } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignMemberId } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { DrizzleCampaignRepository, DrizzleCampaignVariantRepository } from '@pioneer/campaign/infrastructure';
import { CharacterVariantService, EffectivePacks } from '@pioneer/character/application';
import { CharacterCommand, PackAuthority } from '@pioneer/character/domain';
import type { Character, CharacterId, CharacterVariantRule } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { DrizzleCharacterRepository, DrizzleCharacterVariantRepository } from '@pioneer/character/infrastructure';
import {
  contentId,
  ContentLicense,
  ContentPack,
  ContentRegistry,
  EntrySlug,
  LEGACY_CONTENT_VARIANT,
  PackId,
  VariantRuleId,
} from '@pioneer/rules/sdk';
import type { ContentPackId, ContentSource } from '@pioneer/rules/sdk';
import { fixedClock, ForbiddenError, newId, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { CampaignPackDirectory } from './attached-campaign-pack-directory';
import { CampaignVariantRuleCatalog } from './campaign-variant-rule-catalog';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-14T10:00:00Z');
const at = clock.now().toString();

const official = ContentPack.define({
  manifest: { id: 'core-rules', title: 'Core Rules', publisher: 'Pioneer', license: ContentLicense.Homebrew },
  ancestries: [],
  creatures: [],
  variantRules: [
    {
      slug: 'variant-rule:legacy-content',
      name: 'Legacy Content',
      sources: [{ kind: 'book', book: 'gm-core' }],
      rules: [],
    },
    {
      slug: 'variant-rule:without-level',
      name: 'Proficiency Without Level',
      sources: [{ kind: 'book', book: 'gm-core', page: 85 }],
      rules: [],
    },
  ],
});
const withoutLevel = VariantRuleId.parse(
  contentId(PackId.parse('core-rules'), EntrySlug.parse('variant-rule:without-level')),
);
const campaignWithoutLevel = EnabledVariantRuleId.parse(withoutLevel);
const other = VariantRuleId.parse(newId());

const content: ContentSource = {
  registry: async (): Promise<ContentRegistry> => {
    const registry = new ContentRegistry();
    registry.register(official);
    return registry;
  },
};

/** No homebrew packs: the official variant rule is all there is. */
class OfficialOnly extends EffectivePacks {
  readonly #none: readonly ContentPackId[] = [];

  public override async of(): Promise<readonly ContentPackId[]> {
    return this.#none;
  }
}

describe.skipIf(adminUrl === undefined)('variant rules over postgres', () => {
  const recorder = new QueryRecorder();
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleCharacterVariantRepository;
  let campaignVariants: DrizzleCampaignVariantRepository;
  let characterService: CharacterVariantService;
  let campaignService: CampaignVariantService;
  let kyra: CharacterId;
  let kyraCharacter: Character;
  let campaignId: CampaignId;
  let memberId: CampaignMemberId;

  async function stored(): Promise<readonly CharacterVariantRule[]> {
    return repository.listForCharacter(kyra);
  }

  /** Attach Kyra to the campaign, written as SQL as `DrizzleCampaignPartyRepository` is not this context's. */
  async function attach(): Promise<void> {
    await database.db.execute(
      sql`insert into campaign_characters (id, campaign_id, member_id, character_id, attached_at) values (${newId()}, ${campaignId}, ${memberId}, ${kyra}, ${at})`,
    );
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    await Promise.all(
      [amiri, ezren].map(async (user) =>
        database.db.execute(
          sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${user}, 'User', false, ${at}, ${at})`,
        ),
      ),
    );
    const characters = new DrizzleCharacterRepository(database.db);
    const character = new CharacterBuilder().named('Kyra').ownedBy(amiri).build();
    await characters.insert(character, { actor: amiri, command: CharacterCommand.CreateCharacter });
    kyra = character.id;
    kyraCharacter = character;

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

    repository = new DrizzleCharacterVariantRepository(database.db);
    campaignVariants = new DrizzleCampaignVariantRepository(database.db);
    characterService = new CharacterVariantService(
      {
        characters,
        variants: repository,
        content,
        packs: new OfficialOnly(),
        campaigns: new CampaignPackDirectory(database.db),
      },
      clock,
    );
    campaignService = new CampaignVariantService(
      { campaigns, variants: campaignVariants, catalog: new CampaignVariantRuleCatalog(database.db, content) },
      clock,
    );
  });

  beforeEach(async () => {
    await database.db.execute(sql`delete from character_variant_rules where character_id = ${kyra}`);
    await database.db.execute(sql`delete from campaign_variant_rules where campaign_id = ${campaignId}`);
    await database.db.execute(sql`delete from campaign_characters where character_id = ${kyra}`);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a character enables a variant rule once however often it asks, recording who did it', async () => {
    await characterService.enable(amiri, kyra, { variantId: withoutLevel });
    const rules = await characterService.enable(amiri, kyra, { variantId: withoutLevel });
    expect(rules.enabled.map(({ name }) => String(name))).toStrictEqual(['Proficiency Without Level']);
    const rows = await stored();
    expect(rows.map((row) => [row.variantId, row.enabledBy])).toStrictEqual([[withoutLevel, amiri]]);
  });

  test('a variant rule no pack in force defines is not found', async () => {
    const refusal = await characterService.enable(amiri, kyra, { variantId: other }).catch((error: unknown) => error);
    expect(refusal).toMatchObject({ name: 'NotFoundError' });
    expect(await stored()).toStrictEqual([]);
  });

  test('the GM enables a variant rule for the campaign, and a player is refused', async () => {
    const rules = await campaignService.enable(ezren, campaignId, { variantId: campaignWithoutLevel });
    expect(rules.enabled.map(({ name, packTitle }) => [String(name), String(packTitle)])).toStrictEqual([
      ['Proficiency Without Level', 'Core Rules'],
    ]);
    const refusal = await campaignService
      .enable(amiri, campaignId, { variantId: campaignWithoutLevel })
      .catch((error: unknown) => error);
    expect(refusal).toBeInstanceOf(ForbiddenError);
  });

  test('attaching to a campaign switches the effective set to the campaign’s, and detaching switches it back', async () => {
    await characterService.enable(amiri, kyra, { variantId: withoutLevel });
    expect(await characterService.of(kyraCharacter)).toStrictEqual([withoutLevel]);
    await campaignService.enable(ezren, campaignId, { variantId: campaignWithoutLevel });
    await database.db.execute(sql`delete from character_variant_rules where character_id = ${kyra}`);
    expect(await characterService.of(kyraCharacter)).toStrictEqual([]);
    await attach();
    expect(await characterService.of(kyraCharacter)).toStrictEqual([withoutLevel]);

    const attached = await characterService.variantRules(amiri, kyra);
    expect(attached.decidedBy).toBe(PackAuthority.Campaign);
    expect(String(attached.campaign)).toBe('Abomination Vaults');
    expect(attached.enabled.map(({ name }) => String(name))).toStrictEqual(['Proficiency Without Level']);

    await database.db.execute(sql`delete from campaign_characters where character_id = ${kyra}`);
    const detached = await characterService.variantRules(amiri, kyra);
    expect(detached.decidedBy).toBe(PackAuthority.Character);
    expect(detached.enabled).toStrictEqual([]);
  });

  test('a campaign has legacy content off until its GM enables it, and no other campaign is changed by it', async () => {
    const legacy = EnabledVariantRuleId.parse(LEGACY_CONTENT_VARIANT);
    await attach();
    expect(await characterService.of(kyraCharacter)).toStrictEqual([]);

    await campaignService.enable(ezren, campaignId, { variantId: legacy });

    expect(await characterService.of(kyraCharacter)).toStrictEqual([LEGACY_CONTENT_VARIANT]);
    await database.db.execute(sql`delete from campaign_characters where character_id = ${kyra}`);
    expect(await characterService.of(kyraCharacter)).toStrictEqual([]);
  });

  test('every lookup is served by an index', async () => {
    await characterService.enable(amiri, kyra, { variantId: withoutLevel });
    await campaignService.enable(ezren, campaignId, { variantId: campaignWithoutLevel });
    await characterService.variantRules(amiri, kyra);
    await characterService.disable(amiri, kyra, withoutLevel);
    await attach();
    await characterService.variantRules(amiri, kyra);
    await campaignService.variantRules(ezren, campaignId);
    await campaignService.disable(ezren, campaignId, campaignWithoutLevel);
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });

  test('deleting the user who enabled it, the character or the campaign', async () => {
    await characterService.enable(amiri, kyra, { variantId: withoutLevel });
    await campaignService.enable(ezren, campaignId, { variantId: campaignWithoutLevel });
    const stranger = UserId.parse(newId());
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${stranger}, 'User', false, ${at}, ${at})`,
    );
    await database.db.execute(sql`update character_variant_rules set enabled_by = ${stranger}`);
    await database.db.execute(sql`update campaign_variant_rules set enabled_by = ${stranger}`);
    await database.db.execute(sql`delete from users where id = ${stranger}`);
    const [afterUser] = await stored();
    expect(afterUser?.enabledBy).toBeUndefined();
    const [campaignRow] = await campaignVariants.listForCampaign(campaignId);
    expect(campaignRow?.enabledBy).toBeUndefined();

    const refused = await rejection(database.db.execute(sql`delete from characters where id = ${kyra}`));
    expect(refused).toBeInstanceOf(Error);
    expect(await stored()).not.toStrictEqual([]);
    const campaignRefused = await rejection(database.db.execute(sql`delete from campaigns where id = ${campaignId}`));
    expect(campaignRefused).toBeInstanceOf(Error);
    expect(await campaignVariants.listForCampaign(campaignId)).not.toStrictEqual([]);
  });
});
