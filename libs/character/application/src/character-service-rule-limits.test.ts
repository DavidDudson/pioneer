import { beforeEach, describe, expect, test } from 'bun:test';

import {
  AttachedCampaignName,
  CarryState,
  CharacterName,
  CharacterPatchField,
  CORE_RULE_LIMITS,
  Hands,
  HANDS_MAX,
  ItemQuantity,
  ONE_HAND,
} from '@pioneer/character/domain';
import type { Character, CharacterPatch, RuleLimitOverrides } from '@pioneer/character/domain';
import { humanAncestryId, ITEM_FIXTURES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterContent } from './character-content';
import { CharacterRuleLimitService } from './character-rule-limit-service';
import { CharacterService } from './character-service';
import { EffectivePacks } from './effective-packs';
import { EffectiveVariants } from './effective-variants';
import { InMemoryAttachedCampaignPacks } from './in-memory-attached-campaign-packs';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemoryCharacterRuleLimitRepository } from './in-memory-character-rule-limit-repository';

const amiri = UserId.parse(newId());

class NoPacks extends EffectivePacks {
  readonly #none: readonly [] = [];

  public override async of(): Promise<readonly []> {
    return this.#none;
  }
}

class NoVariants extends EffectiveVariants {
  readonly #none: readonly [] = [];

  public override async of(): Promise<readonly []> {
    return this.#none;
  }
}

describe('a character held to its campaign’s table limits', () => {
  let service: CharacterService;
  let campaigns: InMemoryAttachedCampaignPacks;
  let character: Character;

  beforeEach(async () => {
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    campaigns = new InMemoryAttachedCampaignPacks();
    const clock = fixedClock('2026-10-17T10:00:00Z');
    const repository = new InMemoryCharacterRepository();
    const limits = new CharacterRuleLimitService(
      { characters: repository, limits: new InMemoryCharacterRuleLimitRepository(), campaigns },
      clock,
    );
    const content = new CharacterContent(fixedContent(core, ITEM_FIXTURES), new NoPacks(), {
      variants: new NoVariants(),
      limits,
    });
    service = new CharacterService(repository, content, clock);
    character = await service.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  function attach(limits?: RuleLimitOverrides): void {
    campaigns.attach(character.id, {
      name: AttachedCampaignName.parse('Abomination Vaults'),
      packs: [],
      variants: [],
      limits,
    });
  }

  async function edit(patch: CharacterPatch): Promise<Character> {
    ({ character } = await service.patch(amiri, character.id, { expectedVersion: character.version, patch }));
    return character;
  }

  async function gift(name: ItemFixture): Promise<Character> {
    return edit({ field: CharacterPatchField.GiftItem, item: itemFixtureId(name), quantity: ItemQuantity.parse(1) });
  }

  /** Gifts `name` and asks to hold it in `hands`; the edit's outcome, accepted or refused. */
  async function hold(name: ItemFixture, hands: Hands): Promise<void> {
    const saved = await gift(name);
    const added = saved.document.inventory.items.at(-1);
    if (added === undefined) {
      throw new Error('Nothing was added');
    }
    ({ character } = await service.patch(amiri, character.id, {
      expectedVersion: character.version,
      patch: { field: CharacterPatchField.CarryItem, id: added.id, carry: { state: CarryState.Held, hands } },
    }));
  }

  test('a character outside a campaign has the core limits', async () => {
    expect(await service.ruleLimits(amiri, character.id)).toStrictEqual(CORE_RULE_LIMITS);
  });

  test('a campaign’s number replaces the core one, and the rest stay core', async () => {
    attach({ handsMax: Hands.parse(1) });
    expect(await service.ruleLimits(amiri, character.id)).toStrictEqual({ ...CORE_RULE_LIMITS, handsMax: ONE_HAND });
  });

  test('a lowered limit refuses what the core rules would allow', async () => {
    attach({ handsMax: ONE_HAND });
    const error = await rejection(hold(ItemFixture.Greatsword, HANDS_MAX));
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues).toStrictEqual([
      { path: ['patch', 'carry'], message: { key: 'character.validation.handsFull', params: { maximum: ONE_HAND } } },
    ]);
  });

  test('a raised limit lets an edit through no further than the schema stores', async () => {
    attach({ handsMax: Hands.parse(3) });
    await hold(ItemFixture.Greatsword, HANDS_MAX);
    const error = await rejection(hold(ItemFixture.Rope, ONE_HAND));
    expect((error as ValidationError).issues).toStrictEqual([
      { path: ['patch', 'carry'], message: { key: 'character.validation.handsFull', params: { maximum: HANDS_MAX } } },
    ]);
  });
});
