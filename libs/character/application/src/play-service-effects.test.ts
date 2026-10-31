import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  EffectBadgeValue,
  EffectCommandField,
  EffectInstanceId,
  EffectRounds,
  PlayCommandField,
  SELF,
  untypedDamage,
} from '@pioneer/character/domain';
import type { Character, PlayCommand } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentId, ContentKind, HitPoints, StatisticKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, nextVersion, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-13T10:00:00Z');
const FORTITUDE = 'false-vitality';
const INSPIRE = 'inspire';

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
  .withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS)
  .withMagicItem(ContentKind.Effect, FORTITUDE, {
    data: { category: 'spell', duration: { type: 'time', count: 1, unit: 'minute' } },
    rules: [{ key: 'FlatModifier', selectors: ['hp'], type: 'status', slug: FORTITUDE, value: 4 }],
  })
  .withMagicItem(ContentKind.Effect, INSPIRE, {
    data: {
      category: 'spell',
      duration: { type: 'turn', expiry: 'turn-end' },
      badge: { type: 'formula', formula: '1d4' },
    },
  });
const content = fixedContent(builder.build());

const FALSE_VITALITY = ContentId.parse(builder.idOf(ContentKind.Effect, FORTITUDE));
const INSPIRE_ID = ContentId.parse(builder.idOf(ContentKind.Effect, INSPIRE));

const applyEffect = (effect: ContentId, rolled?: number): PlayCommand => ({
  field: EffectCommandField.ApplyEffect,
  id: EffectInstanceId.parse(newId()),
  effect,
  source: SELF,
  ...(rolled === undefined ? {} : { rolled: EffectBadgeValue.parse(rolled) }),
});

describe('PlayService effects', () => {
  let repository: InMemoryCharacterRepository;
  let play: PlayService;
  let kyra: Character;

  beforeEach(async () => {
    repository = new InMemoryCharacterRepository();
    const characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('applying an effect starts its clock from the content, bumps the play revision and is audited by name', async () => {
    const command = applyEffect(FALSE_VITALITY);
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command });
    expect(saved.revision).toBe(nextVersion(FIRST_VERSION));
    expect(saved.play.effects).toMatchObject([{ effect: FALSE_VITALITY, remaining: EffectRounds.parse(10) }]);
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.ApplyEffect);
  });

  test('a formula badge keeps what the sheet rolled', async () => {
    const saved = await play.patch(amiri, kyra.id, {
      expectedRevision: FIRST_VERSION,
      command: applyEffect(INSPIRE_ID, 3),
    });
    expect(saved.play.effects[0]).toMatchObject({ badge: 3, expiry: 'turn-end' });
  });

  test('an effect the content lacks is refused', async () => {
    const unknown = applyEffect(ContentId.parse(builder.idOf(ContentKind.Feat, 'missing')));
    const refused = rejection(play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: unknown }));
    expect(await refused).toBeInstanceOf(ValidationError);
  });

  test('a formula badge applied without its roll is refused', async () => {
    const refused = rejection(
      play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: applyEffect(INSPIRE_ID) }),
    );
    expect(await refused).toBeInstanceOf(ValidationError);
  });

  test('removing an effect the character lacks is refused', async () => {
    const command: PlayCommand = { field: EffectCommandField.RemoveEffect, id: EffectInstanceId.parse(newId()) };
    const refused = rejection(play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command }));
    expect(await refused).toBeInstanceOf(ValidationError);
  });

  test('an effect raises the maximum Hit Points the engine derives, until it is removed', async () => {
    const command = applyEffect(FALSE_VITALITY);
    const applied = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command });
    const down: PlayCommand = { field: PlayCommandField.Damage, damage: untypedDamage(HitPoints.parse(500)) };
    const hurt = await play.patch(amiri, kyra.id, { expectedRevision: applied.revision, command: down });
    expect(hurt.play.hp.damage).toBe(HitPoints.parse(HUMAN_HIT_POINTS + 4));
  });
});
