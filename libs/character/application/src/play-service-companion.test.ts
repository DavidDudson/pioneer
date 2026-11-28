import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  CompanionArchiveReason,
  CompanionId,
  CompanionName,
  CompanionStatus,
  ConditionCommandField,
  ConditionInstanceId,
  FamiliarForm,
  PlayCommandField,
  UNLIMITED,
} from '@pioneer/character/domain';
import type { Character, PlayCommand } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import { CompanionKind, ContentId, HitPoints, SlotKey, StatisticKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterCompanionRepository } from './in-memory-character-companion-repository';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-11-28T10:00:00Z');
const PIP = CompanionId.parse(newId());

const content = fixedContent(
  new ContentPackBuilder()
    .withId('player-core')
    .withAncestry('human', { hitPoints: HUMAN_HIT_POINTS })
    .withStatistic('hp-max', {
      name: 'Hit Points',
      selector: 'hp:max',
      domains: ['hp'],
      base: '@ancestry.hp',
      kind: StatisticKind.Value,
    })
    .withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS)
    .build(),
);

const become = (companion: CompanionId, status: CompanionStatus): PlayCommand => ({
  field: PlayCommandField.SetCompanionStatus,
  companion,
  status,
});

describe('PlayService companion status', () => {
  let repository: InMemoryCharacterRepository;
  let companions: InMemoryCharacterCompanionRepository;
  let play: PlayService;
  let kyra: Character;

  beforeEach(async () => {
    repository = new InMemoryCharacterRepository();
    companions = new InMemoryCharacterCompanionRepository();
    const characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock).withCompanions(companions);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });

    await companions.add(
      { actor: amiri, characterId: kyra.id, expectedVersion: kyra.version, at: clock.now() },
      {
        id: PIP,
        kind: CompanionKind.Familiar,
        name: CompanionName.parse('Pip'),
        form: FamiliarForm.parse({}),
        grantedBy: SlotKey.parse('witch-lesson:0'),
        createdAt: clock.now(),
      },
    );
  });

  test('a familiar that dies is remembered, audited by name and keeps its row', async () => {
    const saved = await play.patch(amiri, kyra.id, {
      expectedRevision: FIRST_VERSION,
      command: become(PIP, CompanionStatus.Dead),
    });

    expect(saved.play.companions[PIP]?.status).toBe(CompanionStatus.Dead);
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.SetCompanionStatus);

    const rows = await companions.listForCharacter(kyra.id);
    expect(rows.map((each) => each.archived)).toStrictEqual([undefined]);
  });

  test('the dead are raised, and the status reads back', async () => {
    const dead = await play.patch(amiri, kyra.id, {
      expectedRevision: FIRST_VERSION,
      command: become(PIP, CompanionStatus.Dead),
    });

    const raised = await play.patch(amiri, kyra.id, {
      expectedRevision: dead.revision,
      command: become(PIP, CompanionStatus.Active),
    });

    const stored = await play.get(amiri, kyra.id);
    expect(raised.play.companions[PIP]?.status).toBe(CompanionStatus.Active);
    expect(stored.play.companions[PIP]?.status).toBe(CompanionStatus.Active);
  });

  test('a dead familiar cannot be absorbed', async () => {
    const dead = await play.patch(amiri, kyra.id, {
      expectedRevision: FIRST_VERSION,
      command: become(PIP, CompanionStatus.Dead),
    });

    const error = await rejection(
      play.patch(amiri, kyra.id, { expectedRevision: dead.revision, command: become(PIP, CompanionStatus.Absorbed) }),
    );

    expect(error).toBeInstanceOf(ValidationError);
  });

  test('a companion the character does not own is refused', async () => {
    const stranger = CompanionId.parse(newId());

    const error = await rejection(
      play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: become(stranger, CompanionStatus.Dead) }),
    );

    expect(error).toBeInstanceOf(ValidationError);
  });

  test('a condition the content does not have is refused for a companion', async () => {
    const instance = ConditionInstanceId.parse(newId());
    const unknown = ContentId.parse(newId());

    const error = await rejection(
      play.patch(amiri, kyra.id, {
        expectedRevision: FIRST_VERSION,
        command: {
          field: PlayCommandField.CompanionCondition,
          companion: PIP,
          change: {
            field: ConditionCommandField.AddCondition,
            condition: { id: instance, condition: unknown, duration: UNLIMITED },
          },
        },
      }),
    );

    expect(error).toBeInstanceOf(ValidationError);
  });

  test('damage a companion has taken is remembered on it', async () => {
    const saved = await play.patch(amiri, kyra.id, {
      expectedRevision: FIRST_VERSION,
      command: { field: PlayCommandField.SetCompanionDamage, companion: PIP, damage: HitPoints.parse(6) },
    });

    expect(saved.play.companions[PIP]?.damage).toBe(HitPoints.parse(6));
    expect(saved.play.hp.damage).toBe(HitPoints.parse(0));
  });

  test('an archived companion cannot be moved', async () => {
    await companions.archive(
      { actor: amiri, characterId: kyra.id, expectedVersion: kyra.version, at: clock.now() },
      { id: PIP, reason: CompanionArchiveReason.Replaced },
    );

    const error = await rejection(
      play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: become(PIP, CompanionStatus.Absent) }),
    );

    expect(error).toBeInstanceOf(ValidationError);
  });
});
