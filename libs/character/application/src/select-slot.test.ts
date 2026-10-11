import { beforeEach, describe, expect, test } from 'bun:test';

import { ANCESTRY_SLOT, CharacterCommand, CharacterName, CharacterPatchField } from '@pioneer/character/domain';
import type { CharacterPatch, PatchCharacterBody } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { AncestryId, ChoiceValue, contentId, EntrySlug, PackId, SlotKey } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const kyra = CharacterName.parse('Kyra');
const amiri = UserId.parse(newId());
const elf = ChoiceValue.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf')));
const featSlot = SlotKey.parse('feat:class:2');
const clock = fixedClock('2026-10-07T10:00:00Z');

/** An edit to a character still at its first version. */
function firstVersion(patch: CharacterPatch): PatchCharacterBody {
  return { expectedVersion: FIRST_VERSION, patch };
}

describe('CharacterService selectSlot', () => {
  let service: CharacterService;
  let repository: InMemoryCharacterRepository;

  beforeEach(() => {
    const pack = new ContentPackBuilder().withId('player-core').withAncestry('human').withAncestry('elf').build();
    repository = new InMemoryCharacterRepository();
    service = new CharacterService(repository, fixedContent(pack), clock);
  });

  test('selectSlot picks an option the slot offers', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const edit = firstVersion({ field: CharacterPatchField.SelectSlot, slot: ANCESTRY_SLOT, selection: elf });
    const { character: patched } = await service.patch(amiri, created.id, edit);
    expect(patched.ancestry).toBe(AncestryId.parse(elf));
  });

  test('selectSlot refuses an option the slot does not offer, with the reason', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const unknown = ChoiceValue.parse(newId());
    const edit = firstVersion({ field: CharacterPatchField.SelectSlot, slot: ANCESTRY_SLOT, selection: unknown });
    const error = await rejection(service.patch(amiri, created.id, edit));
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues).toStrictEqual([
      {
        path: ['patch', 'selection'],
        message: { key: 'character.validation.selectionNotOffered' },
      },
    ]);
    const unchanged = await service.get(amiri, created.id);
    expect(unchanged.version).toBe(FIRST_VERSION);
  });

  test('selectSlot refuses a slot the character has at no level up to 20', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const edit = firstVersion({ field: CharacterPatchField.SelectSlot, slot: featSlot, selection: elf });
    const error = await rejection(service.patch(amiri, created.id, edit));
    expect((error as ValidationError).issues).toStrictEqual([
      {
        path: ['patch', 'slot'],
        message: { key: 'character.validation.slotNotOpen' },
      },
    ]);
  });

  test('a stored selection for a slot the character lacks stays through other edits', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const now = clock.now();
    const planned = ChoiceValue.parse('sudden-charge');
    const withPlan = created.apply({ field: CharacterPatchField.SelectSlot, slot: featSlot, selection: planned }, now);
    const stored = await repository.update(withPlan, FIRST_VERSION, {
      actor: amiri,
      command: CharacterCommand.SelectSlot,
    });
    const edit = { field: CharacterPatchField.SelectSlot, slot: ANCESTRY_SLOT, selection: elf } as const;
    const { character: patched } = await service.patch(amiri, created.id, { expectedVersion: stored.version, patch: edit });
    expect(patched.document.build.choices[featSlot]).toBe(planned);
  });
});

describe('CharacterService selectSlot on boost slots', () => {
  let service: CharacterService;

  beforeEach(() => {
    const pack = new ContentPackBuilder()
      .withId('player-core')
      .withAncestry('human', { boosts: [['str', 'dex', 'con', 'int', 'wis', 'cha']] })
      .withClass('fighter', ['str', 'dex'])
      .build();
    service = new CharacterService(new InMemoryCharacterRepository(), fixedContent(pack), clock);
  });

  test('a boost pick is the only way to change a modifier: it lands in the slot, and its class slot opens with the class', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const fighter = ChoiceValue.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('class:fighter')));
    const { character: withClass } = await service.patch(
      amiri,
      created.id,
      firstVersion({ field: CharacterPatchField.SelectSlot, slot: SlotKey.parse('class'), selection: fighter }),
    );
    const keyAttribute = SlotKey.parse('boost:1:class:0');
    const { character: patched } = await service.patch(amiri, created.id, {
      expectedVersion: withClass.version,
      patch: { field: CharacterPatchField.SelectSlot, slot: keyAttribute, selection: ChoiceValue.parse('dex') },
    });
    expect(patched.document.build.choices[keyAttribute]).toBe(ChoiceValue.parse('dex'));
  });

  test('refuses a boost to an attribute its boost does not allow', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const edit = firstVersion({
      field: CharacterPatchField.SelectSlot,
      slot: SlotKey.parse('boost:1:ancestry:0'),
      selection: ChoiceValue.parse('luck'),
    });
    const error = await rejection(service.patch(amiri, created.id, edit));
    expect((error as ValidationError).issues).toStrictEqual([
      { path: ['patch', 'selection'], message: { key: 'character.validation.selectionNotOffered' } },
    ]);
  });
});
