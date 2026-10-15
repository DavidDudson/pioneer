import { beforeEach, describe, expect, test } from 'bun:test';

import { AttachedCampaignName, CampaignAlly, CharacterId, CharacterName } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterAllyService } from './character-ally-service';
import { CharacterService } from './character-service';
import { InMemoryAttachedCampaignPacks } from './in-memory-attached-campaign-packs';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

function ally(name: string): CampaignAlly {
  return CampaignAlly.parse({ characterId: newId(), name });
}

describe('CharacterAllyService', () => {
  let campaigns: InMemoryAttachedCampaignPacks;
  let allies: CharacterAllyService;
  let kyra: Character;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-15T10:00:00Z');
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    const repository = new InMemoryCharacterRepository();
    campaigns = new InMemoryAttachedCampaignPacks();
    allies = new CharacterAllyService({ characters: repository, campaigns });
    kyra = await new CharacterService(repository, content, clock).create(amiri, {
      name: CharacterName.parse('Kyra'),
      ancestry: humanAncestryId,
    });
  });

  test('a character in no campaign has no allies', async () => {
    expect(await allies.allies(amiri, kyra.id)).toStrictEqual({ allies: [] });
  });

  test('the rest of the party is listed by name, with the campaign', async () => {
    const campaign = { name: AttachedCampaignName.parse('Abomination Vaults'), packs: [], variants: [] };
    campaigns.attach(kyra.id, campaign, [ally('Seoni'), ally('Amiri')]);

    const found = await allies.allies(amiri, kyra.id);

    expect(found.campaign).toBe(campaign.name);
    expect(found.allies.map(({ name }) => name)).toStrictEqual(['Amiri', 'Seoni']);
  });

  test("someone else's character, or a missing one, is not found", async () => {
    expect(await rejection(allies.allies(ezren, kyra.id))).toBeInstanceOf(NotFoundError);
    const missing = CharacterId.parse(newId());
    expect(await rejection(allies.allies(amiri, missing))).toBeInstanceOf(NotFoundError);
  });
});
