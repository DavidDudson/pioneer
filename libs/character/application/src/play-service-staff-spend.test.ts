import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CoinsSchema,
  InventoryItemId,
  InventoryItemSchema,
  ItemQuantity,
  PlayCommandField,
  SpendCount,
  SpendId,
  SpendKind,
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
import { fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, ValidationError } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const clock = fixedClock('2026-10-16T10:00:00Z');
const STAFF = InventoryItemId.parse(newId());
const TWO_ACTIONS = { kind: SpendKind.Actions, count: SpendCount.parse(2) } as const;

/** A 5th-level wizard, who casts 3rd-rank spells, holding the fire staff. */
function wizardWithStaff(): Character {
  const staff: InventoryItem = InventoryItemSchema.parse({
    id: STAFF,
    item: itemFixtureId(ItemFixture.FireStaff),
    quantity: ItemQuantity.parse(1),
    carry: { state: 'held', hands: 1 },
  });
  const caster = new CharacterBuilder().named('Ezren').atLevel(5).picking('class', playerCoreClassId('wizard')).build();
  return caster.withInventory({ items: [staff], coins: CoinsSchema.parse({}) }, clock.now());
}

describe('PlayService staff casts on the spend log', () => {
  let repository: InMemoryCharacterRepository;
  let play: PlayService;
  let ezren: Character;
  let revision: Version;
  const id = SpendId.parse(newId());

  /** The spend casting `spell` from the staff. */
  function castSpend(spell: string, spendId = id): PlayCommand {
    const staff = { item: STAFF, spell: staffSpellId(spell) };
    return { field: PlayCommandField.SpendAction, id: spendId, action: staffSpellId(spell), cost: TWO_ACTIONS, staff };
  }

  async function patch(command: PlayCommand): Promise<CharacterPlay> {
    const saved = await play.patch(ezren.ownerId, ezren.id, { expectedRevision: revision, command });
    ({ revision } = saved);
    return saved;
  }

  async function refused(command: PlayCommand): Promise<unknown> {
    return rejection(play.patch(ezren.ownerId, ezren.id, { expectedRevision: revision, command }));
  }

  beforeEach(async () => {
    const content = fixedContent(playerCoreClasses(), ITEM_FIXTURES);
    repository = new InMemoryCharacterRepository();
    play = new PlayService(repository, content, clock);
    const caster = wizardWithStaff();
    ezren = await repository.insert(caster, { actor: caster.ownerId, command: CharacterCommand.CreateCharacter });
    revision = FIRST_VERSION;
    await patch({ field: PlayCommandField.DailyPreparations, staff: STAFF });
  });

  test("pays the staff's charges and logs the cast in one edit", async () => {
    const saved = await patch(castSpend('fireball'));
    expect(saved.play.resources.staff[STAFF]).toMatchObject({ max: 3, spent: 3 });
    expect(saved.play.spendLog).toHaveLength(1);
    expect(saved.play.spendLog[0]?.staff).toMatchObject({ item: STAFF });
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.SpendAction);
  });

  test('refunds the charges when the spend is taken back', async () => {
    await patch(castSpend('fireball'));
    const saved = await patch({ field: PlayCommandField.UndoSpend, id });
    expect(saved.play.resources.staff[STAFF]).toMatchObject({ spent: 0 });
    expect(saved.play.spendLog).toHaveLength(0);
  });

  test('takes the spend back after the staff is gone, since the log entry says what it spent', async () => {
    await patch(castSpend('fireball'));
    const bare = ezren.withInventory({ items: [], coins: CoinsSchema.parse({}) }, clock.now());
    await repository.update(bare, ezren.version, {
      actor: bare.ownerId,
      command: CharacterCommand.CreateCharacter,
    });
    const saved = await patch({ field: PlayCommandField.UndoSpend, id });
    expect(saved.play.spendLog).toHaveLength(0);
  });

  test('refuses a cast the staff cannot pay for and writes nothing', async () => {
    await patch(castSpend('fireball'));
    const other = castSpend('breathe-fire', SpendId.parse(newId()));
    expect(await refused(other)).toBeInstanceOf(ValidationError);
    const stored = await repository.findPlay(ezren.id);
    expect(stored?.play.spendLog).toHaveLength(1);
    expect(stored?.play.resources.staff[STAFF]).toMatchObject({ spent: 3 });
  });
});
