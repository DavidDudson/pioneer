import { beforeEach, describe, expect, test } from 'bun:test';

import {
  addItem,
  AttachedCampaignId,
  AttachedCampaignName,
  Character,
  CharacterCommand,
  EMPTY_INVENTORY,
  InventoryItemId,
  INVESTED_MAX,
  ItemAcknowledgementId,
  ItemApproval,
  ItemOrigin,
  ItemQuantity,
  RuleBreak,
} from '@pioneer/character/domain';
import type { Inventory, InventoryItem } from '@pioneer/character/domain';
import { CharacterBuilder, ITEM_FIXTURES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { fixedContent } from '@pioneer/rules/sdk/testing';
import { ConflictError, fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterFlaggedItems } from './character-flagged-items';
import { CharacterItemApprovalService } from './character-item-approval-service';
import { InMemoryAttachedCampaignPacks } from './in-memory-attached-campaign-packs';
import { InMemoryCharacterItemAcknowledgementRepository } from './in-memory-character-item-acknowledgement-repository';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const one = ItemQuantity.parse(1);

function idAt(index: number): InventoryItemId {
  return InventoryItemId.parse(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
}

function importedInvested(item: InventoryItem): InventoryItem {
  return { ...item, origin: ItemOrigin.Import, invested: true };
}

/** `extra` ropes more than can be invested, all of them imported and invested. */
function overInvested(extra: number): Inventory {
  let inventory = EMPTY_INVENTORY;
  for (let index = 0; index < INVESTED_MAX + extra; index += 1) {
    inventory = addItem(inventory, {
      id: idAt(index),
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: undefined,
    });
  }
  return { ...inventory, items: inventory.items.map((each) => importedInvested(each)) };
}

function withInventory(inventory: Inventory): Character {
  const built = new CharacterBuilder().named('Kyra').ownedBy(amiri).build();
  return new Character({
    document: { ...built.document, inventory },
    version: built.version,
    createdAt: built.createdAt,
    updatedAt: built.updatedAt,
  });
}

/** An acknowledgement no one made. */
const UNKNOWN = ItemAcknowledgementId.parse(newId());

/** The line that breaks the invested limit: the last rope invested. */
const OVER = { item: idAt(INVESTED_MAX), rule: RuleBreak.Invested } as const;

describe('what silences a character’s rule-breaking warnings', () => {
  let service: CharacterItemApprovalService;
  let campaigns: InMemoryAttachedCampaignPacks;
  let repository: InMemoryCharacterRepository;
  let character: Character;

  beforeEach(async () => {
    repository = new InMemoryCharacterRepository();
    campaigns = new InMemoryAttachedCampaignPacks();
    service = new CharacterItemApprovalService(
      {
        characters: repository,
        acknowledgements: new InMemoryCharacterItemAcknowledgementRepository(),
        campaigns,
        flagged: new CharacterFlaggedItems(fixedContent(ITEM_FIXTURES)),
      },
      fixedClock('2026-11-06T10:00:00Z'),
    );
    character = await repository.insert(withInventory(overInvested(1)), {
      actor: amiri,
      command: CharacterCommand.CreateCharacter,
    });
  });

  function join(): void {
    campaigns.attach(character.id, {
      id: AttachedCampaignId.parse(newId()),
      name: AttachedCampaignName.parse('Abomination Vaults'),
      packs: [],
      variants: [],
    });
  }

  test('a character outside a campaign has no acknowledgement yet, and its owner may make one', async () => {
    expect(await service.itemApprovals(amiri, character.id)).toStrictEqual({
      campaign: undefined,
      acknowledgeable: true,
      approvals: [],
    });
  });

  test('the owner acknowledges a flagged line at the count it breaks the rule by', async () => {
    const view = await service.acknowledge(amiri, character.id, OVER);

    expect(view.acknowledgeable).toBe(true);
    expect(view.approvals).toMatchObject([{ item: OVER.item, rule: RuleBreak.Invested, value: INVESTED_MAX + 1 }]);
    expect(view.approvals[0]?.acknowledgement).toBeDefined();
    expect(await service.itemApprovals(amiri, character.id)).toStrictEqual(view);
  });

  test('acknowledging a line again replaces the count', async () => {
    await service.acknowledge(amiri, character.id, OVER);
    const view = await service.acknowledge(amiri, character.id, OVER);
    expect(view.approvals).toHaveLength(1);
  });

  test('a line that breaks no such rule is a 404', async () => {
    const unknown = await rejection(
      service.acknowledge(amiri, character.id, { item: idAt(0), rule: RuleBreak.Invested }),
    );
    expect(unknown).toBeInstanceOf(NotFoundError);
  });

  test('revoking takes the acknowledgement back, and revoking it twice is no change', async () => {
    const acknowledged = await service.acknowledge(amiri, character.id, OVER);
    const id = ItemAcknowledgementId.parse(acknowledged.approvals[0]?.acknowledgement);

    const first = await service.revoke(amiri, character.id, id);
    const second = await service.revoke(amiri, character.id, id);

    expect(first.approvals).toStrictEqual([]);
    expect(second).toStrictEqual(first);
  });

  test('another user’s character is a 404 to read, acknowledge and revoke', async () => {
    const read = await rejection(service.itemApprovals(ezren, character.id));
    const acknowledge = await rejection(service.acknowledge(ezren, character.id, OVER));
    const revoke = await rejection(service.revoke(ezren, character.id, UNKNOWN));
    expect([read, acknowledge, revoke].every((error) => error instanceof NotFoundError)).toBe(true);
  });

  describe('in a campaign', () => {
    test('the campaign’s approvals are read, and acknowledging or revoking is a 409', async () => {
      const approval = ItemApproval.parse({ item: OVER.item, rule: 'invested', value: INVESTED_MAX + 1 });
      const campaignId = AttachedCampaignId.parse(newId());
      campaigns.attach(character.id, {
        id: campaignId,
        name: AttachedCampaignName.parse('Abomination Vaults'),
        packs: [],
        variants: [],
        approvals: [approval],
      });

      expect(await service.itemApprovals(amiri, character.id)).toStrictEqual({
        campaign: campaignId,
        acknowledgeable: false,
        approvals: [approval],
      });
      const acknowledge = await rejection(service.acknowledge(amiri, character.id, OVER));
      const revoke = await rejection(service.revoke(amiri, character.id, UNKNOWN));
      expect(acknowledge).toBeInstanceOf(ConflictError);
      expect(revoke).toBeInstanceOf(ConflictError);
    });

    test('joining keeps the acknowledgements but ignores them, and leaving brings them back', async () => {
      const acknowledged = await service.acknowledge(amiri, character.id, OVER);

      join();
      const inCampaign = await service.itemApprovals(amiri, character.id);
      expect(inCampaign.approvals).toStrictEqual([]);

      campaigns.detach(character.id);
      expect(await service.itemApprovals(amiri, character.id)).toStrictEqual(acknowledged);
    });
  });
});
