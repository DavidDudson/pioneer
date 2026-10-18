import { beforeEach, describe, expect, test } from 'bun:test';

import {
  ActionCount,
  ActiveSpellId,
  CharacterName,
  EffectRounds,
  PlayCommandField,
  SpellSpendKind,
  SpendCount,
  SpendId,
  SpendKind,
  TurnCommandField,
  TurnEventKind,
} from '@pioneer/character/domain';
import type { Character, PatchedPlay, PlayCommand, SpellSpend, TurnCommand } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentId, ContentKind, SpellRank, StatisticKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fixedClock, FIRST_VERSION, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-16T10:00:00Z');
const SUSTAINED = { type: 'sustained' };

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
  .withSpell('barrier', { rank: 2, traditions: [], duration: SUSTAINED })
  .withSpell('mirror', { rank: 2, traditions: [], duration: SUSTAINED, dismiss: true });
const content = fixedContent(pack.build());
const BARRIER = ContentId.parse(pack.idOf(ContentKind.Spell, 'barrier'));
const MIRROR = ContentId.parse(pack.idOf(ContentKind.Spell, 'mirror'));
const RANK = SpellRank.parse(2);
const TEN_MINUTES = EffectRounds.parse(100);
const ONE_ACTION = { kind: SpendKind.Actions, count: SpendCount.parse(1) } as const;

function spell(action: ContentId, change: SpellSpend): PlayCommand {
  return { field: PlayCommandField.SpendAction, id: SpendId.parse(newId()), action, cost: ONE_ACTION, spell: change };
}

function cast(action: ContentId, id: ActiveSpellId, rounds = TEN_MINUTES): PlayCommand {
  return spell(action, { kind: SpellSpendKind.Cast, id, rank: RANK, rounds });
}

describe('PlayService sustained spells', () => {
  let play: PlayService;
  let kyra: Character;
  let revision: Version;
  const active = ActiveSpellId.parse(newId());

  beforeEach(async () => {
    const repository = new InMemoryCharacterRepository();
    const characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
    revision = FIRST_VERSION;
    await patch({ field: TurnCommandField.StartTurn });
  });

  async function patch(command: PlayCommand | TurnCommand): Promise<PatchedPlay> {
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: revision, command });
    ({ revision } = saved);
    return saved;
  }

  async function stored(): Promise<PatchedPlay> {
    return { ...(await play.get(amiri, kyra.id)), events: [] };
  }

  test('casting a sustained spell adds it for as long as the spell can last', async () => {
    await patch(cast(BARRIER, active));
    const { play: state } = await stored();
    expect(state.activeSpells).toHaveLength(1);
    expect(state.activeSpells[0]).toMatchObject({ spell: BARRIER, remaining: TEN_MINUTES, sustainedThisTurn: true });
  });

  test('casting it for another length of time is refused and nothing is written', async () => {
    const command = cast(BARRIER, active, EffectRounds.parse(10));
    const refused = await rejection(play.patch(amiri, kyra.id, { expectedRevision: revision, command }));
    expect(refused).toBeInstanceOf(ValidationError);
    const { play: state } = await stored();
    expect(state.activeSpells).toEqual([]);
  });

  test('a spell sustained each turn stays, and one that is not ends with the turn', async () => {
    await patch(cast(BARRIER, active));
    await patch({ field: TurnCommandField.EndTurn });
    await patch({ field: TurnCommandField.StartTurn });
    await patch(spell(BARRIER, { kind: SpellSpendKind.Sustain, id: active }));
    await patch({ field: TurnCommandField.EndTurn });
    const kept = await stored();
    expect(kept.play.activeSpells).toHaveLength(1);
    await patch({ field: TurnCommandField.StartTurn });
    const ended = await patch({ field: TurnCommandField.EndTurn });
    expect(ended.play.activeSpells).toEqual([]);
    expect(ended.events.some(({ kind }) => kind === TurnEventKind.SpellEnded)).toBe(true);
  });

  test('a spell is dismissed at will for free', async () => {
    await patch(cast(BARRIER, active));
    const dismissed = await patch({ field: PlayCommandField.DismissSpell, id: active });
    expect(dismissed.play.activeSpells).toEqual([]);
  });

  test('the Dismiss action takes one action, and only for a spell whose content has it', async () => {
    const other = ActiveSpellId.parse(newId());
    await patch(cast(BARRIER, active));
    await patch(cast(MIRROR, other));
    const command = spell(BARRIER, { kind: SpellSpendKind.Dismiss, id: active });
    const refused = await rejection(play.patch(amiri, kyra.id, { expectedRevision: revision, command }));
    expect(refused).toBeInstanceOf(ValidationError);
    const before = await stored();
    const dismissed = await patch(spell(MIRROR, { kind: SpellSpendKind.Dismiss, id: other }));
    expect(dismissed.play.activeSpells.map(({ id }) => id)).toEqual([active]);
    const left = ActionCount.parse(before.play.turn.actions - 1);
    expect(dismissed.play.turn.actions).toBe(left);
  });
});
