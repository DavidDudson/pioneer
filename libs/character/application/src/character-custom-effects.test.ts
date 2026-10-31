import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  CharacterPatchField,
  CustomEffectInput,
  OverrideAuthorName,
  OverrideRole,
  PatchCharacterBody,
} from '@pioneer/character/domain';
import type { Character, CharacterPatch } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, ForbiddenError, newId, UserId } from '@pioneer/shared/kernel';
import type { ValidationError, Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterCampaignRoles } from './in-memory-character-campaign-roles';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemoryOverrideAuthorDirectory } from './in-memory-override-author-directory';

const amiri = UserId.parse(newId());
const gm = UserId.parse(newId());

const BLESSING = CustomEffectInput.parse({
  name: 'Blessing of the Hearth',
  reason: 'Festival boon',
  lines: [{ target: 'ac', value: 1, type: 'status' }],
});
const ADD: CharacterPatch = { field: CharacterPatchField.AddCustomEffect, effect: BLESSING };

function at(expectedVersion: Version, patch: object): PatchCharacterBody {
  return PatchCharacterBody.parse({ expectedVersion, patch });
}

describe('CharacterService custom effects', () => {
  let service: CharacterService;
  let repository: InMemoryCharacterRepository;
  let kyra: Character;

  beforeEach(async () => {
    const ancestries = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    repository = new InMemoryCharacterRepository();
    service = new CharacterService(repository, fixedContent(ancestries), fixedClock('2026-10-12T10:00:00Z'));
    service.withAuthors(new InMemoryOverrideAuthorDirectory().name(amiri, 'Amiri'));
    kyra = await service.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('adds, switches off and on, then removes an effect, each audited and the author named', async () => {
    const { character: added } = await service.patch(amiri, kyra.id, at(FIRST_VERSION, ADD));
    const id = added.document.customEffects[0]?.id;
    const off = { field: CharacterPatchField.ToggleCustomEffect, id, enabled: false };
    const { character: switchedOff } = await service.patch(amiri, kyra.id, at(added.version, off));
    const on = { ...off, enabled: true };
    const { character: switchedOn } = await service.patch(amiri, kyra.id, at(switchedOff.version, on));
    const remove = { field: CharacterPatchField.RemoveCustomEffect, id, reason: 'Festival over' };
    const { character: removed } = await service.patch(amiri, kyra.id, at(switchedOn.version, remove));

    expect(added.document.customEffects[0]).toMatchObject({ name: 'Blessing of the Hearth', by: amiri, enabled: true });
    expect(switchedOff.document.customEffects[0]?.enabled).toBe(false);
    expect(switchedOn.document.customEffects[0]?.toggles).toHaveLength(2);
    expect(removed.document.customEffects[0]?.removed).toMatchObject({ by: amiri, reason: 'Festival over' });
    expect(repository.audits.map((audit) => audit.command)).toStrictEqual([
      CharacterCommand.CreateCharacter,
      CharacterCommand.AddCustomEffect,
      CharacterCommand.ToggleCustomEffect,
      CharacterCommand.ToggleCustomEffect,
      CharacterCommand.RemoveCustomEffect,
    ]);
    const sheet = await service.sheet(removed);
    expect(sheet.authors).toStrictEqual([{ userId: amiri, displayName: OverrideAuthorName.parse('Amiri') }]);
  });

  test('refuses an effect the character does not have, before anything is written', async () => {
    const toggle = { field: CharacterPatchField.ToggleCustomEffect, id: newId(), enabled: false };
    const error = await rejection(service.patch(amiri, kyra.id, at(FIRST_VERSION, toggle)));

    expect((error as ValidationError).issues).toStrictEqual([
      { path: ['patch'], message: { key: 'character.validation.customEffectUnknown' } },
    ]);
    expect(repository.audits).toHaveLength(1);
  });

  test('refuses an effect with no reason or no lines at the request body', () => {
    const noReason = { ...ADD, effect: { ...BLESSING, reason: '  ' } };
    const noLines = { ...ADD, effect: { ...BLESSING, lines: [] } };

    expect(PatchCharacterBody.safeParse({ expectedVersion: FIRST_VERSION, patch: noReason }).success).toBe(false);
    expect(PatchCharacterBody.safeParse({ expectedVersion: FIRST_VERSION, patch: noLines }).success).toBe(false);
  });

  test('lets a GM add an effect the owner can switch but only the GM can remove', async () => {
    service.withCampaignRoles(new InMemoryCharacterCampaignRoles().assign(kyra.id, gm, OverrideRole.Gm));
    const { character: added } = await service.patch(gm, kyra.id, at(FIRST_VERSION, ADD));
    const id = added.document.customEffects[0]?.id;
    const off = { field: CharacterPatchField.ToggleCustomEffect, id, enabled: false };
    const { character: switchedOff } = await service.patch(amiri, kyra.id, at(added.version, off));
    const remove = { field: CharacterPatchField.RemoveCustomEffect, id, reason: 'Not wanted' };
    const refused = await rejection(service.patch(amiri, kyra.id, at(switchedOff.version, remove)));
    const { character: removed } = await service.patch(gm, kyra.id, at(switchedOff.version, remove));

    expect(added.document.customEffects[0]).toMatchObject({ by: gm, byRole: OverrideRole.Gm });
    expect(switchedOff.document.customEffects[0]?.toggles[0]).toMatchObject({ by: amiri, byRole: OverrideRole.Player });
    expect(refused).toBeInstanceOf(ForbiddenError);
    expect(removed.document.customEffects[0]?.removed).toMatchObject({ by: gm });
  });
});
