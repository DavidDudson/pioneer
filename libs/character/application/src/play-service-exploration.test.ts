import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterCommand, CharacterName, PlayCommandField } from '@pioneer/character/domain';
import type { Character, PlayCommand } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentId, ContentKind, StatisticKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fixedClock, FIRST_VERSION, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-14T10:00:00Z');

const builder = new ContentPackBuilder()
  .withId('player-core')
  .withAncestry('human', { hitPoints: HUMAN_HIT_POINTS })
  .withStatistic('hp-max', {
    name: 'Hit Points',
    selector: 'hp:max',
    domains: ['hp'],
    base: '@ancestry.hp',
    kind: StatisticKind.Value,
  })
  .withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS);
builder.withItem(ContentKind.Action, 'avoid-notice', {
  universal: true,
  modes: ['exploration'],
  skills: ['skill:stealth'],
});
builder.withItem(ContentKind.Action, 'strike', { cost: 'one', universal: true });
const content = fixedContent(builder.build());

const avoidNotice = ContentId.parse(builder.idOf(ContentKind.Action, 'avoid-notice'));
const strike = ContentId.parse(builder.idOf(ContentKind.Action, 'strike'));

const pick = (activity?: ContentId): PlayCommand =>
  activity === undefined
    ? { field: PlayCommandField.SetExplorationActivity }
    : { field: PlayCommandField.SetExplorationActivity, activity };

describe('PlayService exploration activity', () => {
  let repository: InMemoryCharacterRepository;
  let play: PlayService;
  let kyra: Character;

  beforeEach(async () => {
    repository = new InMemoryCharacterRepository();
    const characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('a character has picked no activity until it does', async () => {
    const stored = await play.get(amiri, kyra.id);
    expect(stored.play.exploration).toBeUndefined();
  });

  test('the activity picked is remembered and audited by name', async () => {
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: pick(avoidNotice) });
    expect(saved.play.exploration).toBe(avoidNotice);
    const stored = await play.get(amiri, kyra.id);
    expect(stored.play.exploration).toBe(avoidNotice);
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.SetExplorationActivity);
  });

  test('picking none clears it', async () => {
    const first = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: pick(avoidNotice) });
    const cleared = await play.patch(amiri, kyra.id, { expectedRevision: first.revision, command: pick() });
    expect(cleared.play.exploration).toBeUndefined();
  });

  test('an action that is not used while exploring is refused', async () => {
    const refused = play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: pick(strike) });
    expect(await rejection(refused)).toBeInstanceOf(ValidationError);
  });
});
