import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterCommand, CharacterName, PlayCommandField } from '@pioneer/character/domain';
import type { Character, PlayCommand } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentId, StatisticKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fixedClock, FIRST_VERSION, newId, nextVersion, UserId } from '@pioneer/shared/kernel';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-26T10:00:00Z');

const pack = new ContentPackBuilder()
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
  .withEnvironment('underwater', { restrictions: [{ id: 'speech', reason: "You can't speak underwater." }] });
const UNDERWATER = ContentId.parse(pack.idOf('environment', 'underwater'));
const content = fixedContent(pack.build());

const setUnderwater = (active: boolean, environment: ContentId = UNDERWATER): PlayCommand => ({
  field: PlayCommandField.SetEnvironment,
  environment,
  active,
});

describe('PlayService environments', () => {
  let repository: InMemoryCharacterRepository;
  let play: PlayService;
  let kyra: Character;

  beforeEach(async () => {
    repository = new InMemoryCharacterRepository();
    const characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('an environment turned on is remembered, bumps the play revision and is audited by name', async () => {
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: setUnderwater(true) });

    expect(saved.revision).toBe(nextVersion(FIRST_VERSION));
    expect(saved.play.environments).toStrictEqual([UNDERWATER]);
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.SetEnvironment);
  });

  test('an environment turned back off is gone on a later read', async () => {
    const first = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: setUnderwater(true) });
    await play.patch(amiri, kyra.id, { expectedRevision: first.revision, command: setUnderwater(false) });
    const stored = await play.get(amiri, kyra.id);

    expect(stored.play.environments).toStrictEqual([]);
  });

  test('an environment the content lacks is refused', () => {
    const unknown = ContentId.parse('00000000-0000-4000-8000-0000000000ff');

    expect(
      play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: setUnderwater(true, unknown) }),
    ).rejects.toThrow();
  });

  test('a character that has turned none on is in none', async () => {
    const stored = await play.get(amiri, kyra.id);

    expect(stored.play.environments).toStrictEqual([]);
  });
});
