import { beforeEach, describe, expect, test } from 'bun:test';

import {
  AttachedCampaignName,
  CharacterName,
  CORE_RULE_LIMITS,
  Hands,
  LIMIT_CEILINGS,
  PackAuthority,
  RuleLimitSettingValue,
} from '@pioneer/character/domain';
import type { Character, RuleLimitOverrides } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { ConflictError, fixedClock, newId, NotFoundError, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterRuleLimitService } from './character-rule-limit-service';
import { CharacterService } from './character-service';
import { InMemoryAttachedCampaignPacks } from './in-memory-attached-campaign-packs';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemoryCharacterRuleLimitRepository } from './in-memory-character-rule-limit-repository';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

const value = (number: number): RuleLimitSettingValue => RuleLimitSettingValue.parse(number);

describe('the table limits a character sets for itself', () => {
  let service: CharacterRuleLimitService;
  let campaigns: InMemoryAttachedCampaignPacks;
  let character: Character;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-17T10:00:00Z');
    const repository = new InMemoryCharacterRepository();
    campaigns = new InMemoryAttachedCampaignPacks();
    service = new CharacterRuleLimitService(
      { characters: repository, limits: new InMemoryCharacterRuleLimitRepository(), campaigns },
      clock,
    );
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    character = await new CharacterService(repository, content, clock).create(amiri, {
      name: CharacterName.parse('Kyra'),
      ancestry: humanAncestryId,
    });
  });

  function attach(limits?: RuleLimitOverrides): void {
    campaigns.attach(character.id, {
      name: AttachedCampaignName.parse('Abomination Vaults'),
      packs: [],
      variants: [],
      limits,
    });
  }

  test('start as the core rules’, decided by the owner', async () => {
    const settings = await service.ruleLimitSettings(amiri, character.id);
    expect(settings.decidedBy).toBe(PackAuthority.Character);
    expect(settings.manageable).toBe(true);
    expect(settings.limits.map(({ limit, value: each, custom }) => [limit, each, custom])).toStrictEqual([
      ['investedMax', CORE_RULE_LIMITS.investedMax, false],
      ['handsMax', CORE_RULE_LIMITS.handsMax, false],
      ['propertyRunesPerGrade', CORE_RULE_LIMITS.propertyRunesPerGrade, false],
      ['itemsMax', CORE_RULE_LIMITS.itemsMax, false],
    ]);
    expect(await service.of(character)).toStrictEqual(CORE_RULE_LIMITS);
  });

  test('a number the owner sets is in force, and the rest stay core', async () => {
    const settings = await service.set(amiri, character.id, { limit: 'investedMax', value: value(12) });
    expect(settings.limits[0]).toMatchObject({ limit: 'investedMax', value: 12, core: 10, custom: true });
    expect(await service.of(character)).toStrictEqual({ ...CORE_RULE_LIMITS, investedMax: 12 });
  });

  test('a reset returns the number to the core rules’, and twice is harmless', async () => {
    await service.set(amiri, character.id, { limit: 'investedMax', value: value(12) });
    await service.reset(amiri, character.id, 'investedMax');
    const settings = await service.reset(amiri, character.id, 'investedMax');
    expect(settings.limits[0]).toMatchObject({ value: CORE_RULE_LIMITS.investedMax, custom: false });
  });

  test('a number past the ceiling is a 422 and stores nothing', async () => {
    const error = await rejection(
      service.set(amiri, character.id, { limit: 'handsMax', value: value(LIMIT_CEILINGS.handsMax + 1) }),
    );
    expect(error).toBeInstanceOf(ValidationError);
    expect(await service.of(character)).toStrictEqual(CORE_RULE_LIMITS);
  });

  test('another user’s character is a 404 to read and to change', async () => {
    const read = await rejection(service.ruleLimitSettings(ezren, character.id));
    const set = await rejection(service.set(ezren, character.id, { limit: 'itemsMax', value: value(9) }));
    const reset = await rejection(service.reset(ezren, character.id, 'itemsMax'));
    expect([read, set, reset].every((error) => error instanceof NotFoundError)).toBe(true);
  });

  describe('in a campaign', () => {
    test('the campaign’s numbers decide, and the owner cannot change them: 409', async () => {
      await service.set(amiri, character.id, { limit: 'investedMax', value: value(12) });
      attach({ handsMax: Hands.parse(1) });

      const settings = await service.ruleLimitSettings(amiri, character.id);
      expect(settings).toMatchObject({ decidedBy: PackAuthority.Campaign, campaign: 'Abomination Vaults' });
      expect(settings.manageable).toBe(false);
      expect(await service.of(character)).toStrictEqual({ ...CORE_RULE_LIMITS, handsMax: 1 });
      const set = await rejection(service.set(amiri, character.id, { limit: 'itemsMax', value: value(9) }));
      const reset = await rejection(service.reset(amiri, character.id, 'investedMax'));
      expect(set).toBeInstanceOf(ConflictError);
      expect(reset).toBeInstanceOf(ConflictError);
    });

    test('detaching brings the character’s own back untouched', async () => {
      await service.set(amiri, character.id, { limit: 'investedMax', value: value(12) });
      attach();
      expect(await service.of(character)).toStrictEqual(CORE_RULE_LIMITS);

      campaigns.detach(character.id);
      expect(await service.of(character)).toStrictEqual({ ...CORE_RULE_LIMITS, investedMax: 12 });
    });
  });
});
