import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterCommand, CharacterName, PlayCommandField } from '@pioneer/character/domain';
import type { Character, PlayCommand } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import { Slug, StatisticKind, ToggleKey } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, nextVersion, UserId } from '@pioneer/shared/kernel';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-14T10:00:00Z');
const RAGE = ToggleKey.parse('player-core:effect:rage:0');

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

const setRage = (on: boolean): PlayCommand => ({
  field: PlayCommandField.SetToggle,
  toggle: RAGE,
  state: { on, suboption: Slug.parse('fury') },
});

describe('PlayService toggles', () => {
  let repository: InMemoryCharacterRepository;
  let play: PlayService;
  let kyra: Character;

  beforeEach(async () => {
    repository = new InMemoryCharacterRepository();
    const characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('a toggle set is remembered, bumps the play revision and is audited by name', async () => {
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: setRage(true) });
    expect(saved.revision).toBe(nextVersion(FIRST_VERSION));
    expect(saved.play.toggles).toStrictEqual({ [RAGE]: { on: true, suboption: Slug.parse('fury') } });
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.SetToggle);
  });

  test('a toggle set back off is remembered off, and a later read sees it', async () => {
    const first = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: setRage(true) });
    await play.patch(amiri, kyra.id, { expectedRevision: first.revision, command: setRage(false) });
    const stored = await play.get(amiri, kyra.id);
    expect(stored.play.toggles[RAGE]?.on).toBe(false);
  });

  test('a character that has set none has none', async () => {
    const stored = await play.get(amiri, kyra.id);
    expect(stored.play.toggles).toStrictEqual({});
  });
});
