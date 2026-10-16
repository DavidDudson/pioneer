import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CoinsSchema,
  InventoryItemId,
  InventoryItemSchema,
  ItemQuantity,
  PlayCommandField,
  slotCountKey,
} from '@pioneer/character/domain';
import type { Character, CharacterPlay, InventoryItem, PlayCommand } from '@pioneer/character/domain';
import {
  CharacterBuilder,
  ITEM_FIXTURES,
  ItemFixture,
  itemFixtureId,
  playerCoreClasses,
  playerCoreClassId,
  staffSpellId,
} from '@pioneer/character/domain/testing';
import { Slug } from '@pioneer/rules/sdk';
import { fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, FIRST_VERSION, newId, ValidationError } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const clock = fixedClock('2026-10-13T10:00:00Z');
const STAFF = InventoryItemId.parse(newId());

/** A 5th-level wizard, who casts 3rd-rank spells, holding the fire staff. */
function wizardWithStaff(): Character {
  const staff: InventoryItem = InventoryItemSchema.parse({
    id: STAFF,
    item: itemFixtureId(ItemFixture.FireStaff),
    quantity: ItemQuantity.parse(1),
    carry: { state: 'held', hands: 1 },
  });
  const wizard = new CharacterBuilder().named('Ezren').atLevel(5).picking('class', playerCoreClassId('wizard')).build();
  return wizard.withInventory({ items: [staff], coins: CoinsSchema.parse({}) }, clock.now());
}

function cast(spell: string, field: 'castStaff' | 'uncastStaff' = PlayCommandField.CastStaff): PlayCommand {
  return { field, item: STAFF, spell: staffSpellId(spell) };
}

describe('PlayService staves', () => {
  let repository: InMemoryCharacterRepository;
  let play: PlayService;
  let ezren: Character;
  let revision: Version;

  async function patch(command: PlayCommand): Promise<CharacterPlay> {
    const saved = await play.patch(ezren.ownerId, ezren.id, { expectedRevision: revision, command });
    ({ revision } = saved);
    return saved;
  }

  async function refused(command: PlayCommand): Promise<unknown> {
    return rejection(play.patch(ezren.ownerId, ezren.id, { expectedRevision: revision, command }));
  }

  /** Prepares the staff with the wizard's 3 charges: the highest spell rank. */
  async function prepared(): Promise<void> {
    await patch({ field: PlayCommandField.DailyPreparations, staff: STAFF });
  }

  beforeEach(async () => {
    const content = fixedContent(playerCoreClasses(), ITEM_FIXTURES);
    repository = new InMemoryCharacterRepository();
    play = new PlayService(repository, content, clock);
    const wizard = wizardWithStaff();
    ezren = await repository.insert(wizard, { actor: wizard.ownerId, command: CharacterCommand.CreateCharacter });
    revision = FIRST_VERSION;
  });

  test('a ranked spell spends charges equal to its rank, and is audited', async () => {
    await prepared();
    const saved = await patch(cast('fireball'));
    expect(saved.play.resources.staff[STAFF]).toMatchObject({ max: 3, spent: 3 });
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.CastStaff);
  });

  test('a cantrip spends nothing', async () => {
    await prepared();
    const saved = await patch(cast('ignition'));
    expect(saved.play.resources.staff[STAFF]).toMatchObject({ max: 3, spent: 0 });
  });

  test('a cast the staff cannot pay for is refused and writes nothing', async () => {
    await prepared();
    await patch(cast('fireball'));
    expect(await refused(cast('breathe-fire'))).toBeInstanceOf(ValidationError);
    const stored = await repository.findPlay(ezren.id);
    expect(stored?.play.resources.staff[STAFF]).toMatchObject({ spent: 3 });
  });

  test('a staff that was not prepared has no charges to cast with', async () => {
    expect(await refused(cast('breathe-fire'))).toBeInstanceOf(ValidationError);
  });

  test('a prepared caster cannot pay with a slot', async () => {
    await prepared();
    const slot = slotCountKey(Slug.parse('wizard'), undefined, 3);
    expect(await refused({ ...cast('fireball'), slot })).toBeInstanceOf(ValidationError);
  });

  test('taking a cast back refunds its charges, and is audited', async () => {
    await prepared();
    await patch(cast('fireball'));
    const saved = await patch(cast('fireball', PlayCommandField.UncastStaff));
    expect(saved.play.resources.staff[STAFF]).toMatchObject({ spent: 0 });
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.UncastStaff);
  });

  test('taking back a cast that was not made is refused', async () => {
    await prepared();
    expect(await refused(cast('fireball', PlayCommandField.UncastStaff))).toBeInstanceOf(ValidationError);
  });

  test('a spell the staff does not hold is refused', async () => {
    await prepared();
    expect(await refused(cast('heal'))).toBeInstanceOf(ValidationError);
  });
});
