import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterName,
  CharacterPatchField,
  OverrideInput,
  OverrideRole,
  PatchCharacterBody,
} from '@pioneer/character/domain';
import type { Character, CharacterPatch } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, ForbiddenError, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterCampaignRoles } from './in-memory-character-campaign-roles';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const gm = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());

const SHIELD = OverrideInput.parse({ target: 'ac', mode: 'adjust', value: 2, type: 'item', reason: 'Shield spell' });
const ADD: CharacterPatch = { field: CharacterPatchField.AddOverride, override: SHIELD };
const WRITE_APPEARANCE: CharacterPatch = { field: CharacterPatchField.SetAppearance, value: [] };

function at(expectedVersion: Version, patch: CharacterPatch): PatchCharacterBody {
  return PatchCharacterBody.parse({ expectedVersion, patch });
}

describe('CharacterService overrides by a campaign GM', () => {
  let service: CharacterService;
  let kyra: Character;

  beforeEach(async () => {
    const ancestries = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    service = new CharacterService(
      new InMemoryCharacterRepository(),
      fixedContent(ancestries),
      fixedClock('2026-10-12T10:00:00Z'),
    );
    kyra = await service.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
    const roles = new InMemoryCharacterCampaignRoles()
      .assign(kyra.id, gm, OverrideRole.Gm)
      .assign(kyra.id, ezren, OverrideRole.Player);
    service.withCampaignRoles(roles);
  });

  test('lets the GM read the character and add an override, marked as the GM’s', async () => {
    const read = await service.get(gm, kyra.id);
    const { character } = await service.patch(gm, kyra.id, at(FIRST_VERSION, ADD));

    expect(read.id).toBe(kyra.id);
    expect(character.document.overrides[0]).toMatchObject({ by: gm, byRole: OverrideRole.Gm });
  });

  test('marks the owner’s own override as the player’s', async () => {
    const { character } = await service.patch(amiri, kyra.id, at(FIRST_VERSION, ADD));

    expect(character.document.overrides[0]).toMatchObject({ by: amiri, byRole: OverrideRole.Player });
  });

  test('keeps every other edit the owner’s: the GM gets a 404', async () => {
    const error = await rejection(service.patch(gm, kyra.id, at(FIRST_VERSION, WRITE_APPEARANCE)));

    expect(error).toBeInstanceOf(NotFoundError);
  });

  test('refuses a player of the campaign an override edit with a 403, and anything else with a 404', async () => {
    const forbidden = await rejection(service.patch(ezren, kyra.id, at(FIRST_VERSION, ADD)));
    const hidden = await rejection(service.patch(ezren, kyra.id, at(FIRST_VERSION, WRITE_APPEARANCE)));
    const unread = await rejection(service.get(ezren, kyra.id));

    expect(forbidden).toBeInstanceOf(ForbiddenError);
    expect(hidden).toBeInstanceOf(NotFoundError);
    expect(unread).toBeInstanceOf(NotFoundError);
  });

  test('gives a user outside the campaign a 404 on an override edit, as before', async () => {
    const error = await rejection(service.patch(stranger, kyra.id, at(FIRST_VERSION, ADD)));

    expect(error).toBeInstanceOf(NotFoundError);
  });

  test('lets the owner edit an override the GM wrote, which stays the GM’s to remove', async () => {
    const { character: added } = await service.patch(gm, kyra.id, at(FIRST_VERSION, ADD));
    const id = added.document.overrides[0]?.id;
    const edit = { field: CharacterPatchField.EditOverride, id, override: { ...SHIELD, value: 3 } };
    const remove = { field: CharacterPatchField.RemoveOverride, id, reason: 'Not wanted' };

    const { character: edited } = await service.patch(amiri, kyra.id, at(added.version, edit));
    const refusedRemove = await rejection(service.patch(amiri, kyra.id, at(edited.version, remove)));
    const { character: removed } = await service.patch(gm, kyra.id, at(edited.version, remove));

    expect(edited.document.overrides[0]).toMatchObject({ by: amiri, byRole: OverrideRole.Gm, value: 3 });
    expect(refusedRemove).toBeInstanceOf(ForbiddenError);
    expect(removed.document.overrides[0]?.removed).toMatchObject({ by: gm });
  });

  test('lets the owner remove their own override, and the GM take one over by editing it', async () => {
    const { character: added } = await service.patch(amiri, kyra.id, at(FIRST_VERSION, ADD));
    const id = added.document.overrides[0]?.id;
    const edit = { field: CharacterPatchField.EditOverride, id, override: { ...SHIELD, value: 3 } };
    const { character: edited } = await service.patch(gm, kyra.id, at(added.version, edit));
    const remove = { field: CharacterPatchField.RemoveOverride, id, reason: 'Not wanted' };

    expect(edited.document.overrides[0]).toMatchObject({ by: gm, byRole: OverrideRole.Gm });
    expect(edited.document.overrides[0]?.revisions[0]).toMatchObject({ by: amiri, byRole: OverrideRole.Player });
    const refused = await rejection(service.patch(amiri, kyra.id, at(edited.version, remove)));
    expect(refused).toBeInstanceOf(ForbiddenError);
  });
});
