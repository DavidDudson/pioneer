import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterName, CORE_RULE_LIMITS, RuleLimitSettingValue, RuleLimitSource } from '@pioneer/character/domain';
import type { Character, CharacterRuleLimitSettings, RuleLimitField } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId, VariantLimitValue, VariantRuleId } from '@pioneer/rules/sdk';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

import { CharacterRuleLimitService } from './character-rule-limit-service';
import { CharacterService } from './character-service';
import { CharacterVariantLimits } from './character-variant-limits';
import { EffectivePacks } from './effective-packs';
import { EffectiveVariants } from './effective-variants';
import { InMemoryAttachedCampaignPacks } from './in-memory-attached-campaign-packs';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemoryCharacterRuleLimitRepository } from './in-memory-character-rule-limit-repository';

const amiri = UserId.parse(newId());

const variant = (number: number): VariantLimitValue => VariantLimitValue.parse(number);
const setting = (number: number): RuleLimitSettingValue => RuleLimitSettingValue.parse(number);

function variantId(slug: string): VariantRuleId {
  return VariantRuleId.parse(contentId(PackId.parse('table-rules'), EntrySlug.parse(`variant-rule:${slug}`)));
}

const pack = new ContentPackBuilder()
  .withId('table-rules')
  .withVariantRule('lavish', undefined, { investedMax: variant(12), itemsMax: variant(800) })
  .withVariantRule('hoarder', undefined, { investedMax: variant(11), itemsMax: variant(1000) })
  .withVariantRule('one-handed', undefined, { handsMax: variant(1) })
  .withVariantRule('plain')
  .build();

function sourceOf(settings: CharacterRuleLimitSettings, limit: RuleLimitField): RuleLimitSource | undefined {
  return settings.limits.find((each) => each.limit === limit)?.source;
}

/** The variant rules in force are given by the test. */
class StubVariants extends EffectiveVariants {
  public enabled: readonly VariantRuleId[] = [];
  public override async of(): Promise<readonly VariantRuleId[]> {
    return this.enabled;
  }
}

class NoPacks extends EffectivePacks {
  readonly #none: readonly ContentPackId[] = [];
  public override async of(): Promise<readonly ContentPackId[]> {
    return this.#none;
  }
}

describe('table limits with variant rules in force', () => {
  let service: CharacterRuleLimitService;
  let variants: StubVariants;
  let character: Character;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-17T10:00:00Z');
    const repository = new InMemoryCharacterRepository();
    variants = new StubVariants();
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    const content = fixedContent(core, pack);
    service = new CharacterRuleLimitService(
      {
        characters: repository,
        limits: new InMemoryCharacterRuleLimitRepository(),
        campaigns: new InMemoryAttachedCampaignPacks(),
        variantLimits: new CharacterVariantLimits({ content, packs: new NoPacks(), variants }),
      },
      clock,
    );
    character = await new CharacterService(repository, content, clock).create(amiri, {
      name: CharacterName.parse('Kyra'),
      ancestry: humanAncestryId,
    });
  });

  test('with no variant rule in force the core rules apply, and say so', async () => {
    const settings = await service.ruleLimitSettings(amiri, character.id);
    expect(await service.of(character)).toStrictEqual(CORE_RULE_LIMITS);
    expect(settings.limits.every(({ source }) => source === RuleLimitSource.Core)).toBe(true);
  });

  test('a variant rule’s number beats the core rules’, and a limit it leaves out stays core', async () => {
    variants.enabled = [variantId('lavish'), variantId('plain')];
    const settings = await service.ruleLimitSettings(amiri, character.id);
    expect<object>(await service.of(character)).toStrictEqual({ ...CORE_RULE_LIMITS, investedMax: 12, itemsMax: 800 });
    expect(sourceOf(settings, 'investedMax')).toBe(RuleLimitSource.Variant);
    expect(sourceOf(settings, 'handsMax')).toBe(RuleLimitSource.Core);
    expect(settings.limits[0]).toMatchObject({ value: 12, core: 10, custom: false });
  });

  test('the owner’s explicit number beats a variant rule’s, even a lower one', async () => {
    variants.enabled = [variantId('lavish')];
    const settings = await service.set(amiri, character.id, { limit: 'investedMax', value: setting(9) });
    expect<object>(await service.of(character)).toStrictEqual({ ...CORE_RULE_LIMITS, investedMax: 9, itemsMax: 800 });
    expect(sourceOf(settings, 'investedMax')).toBe(RuleLimitSource.Character);
    expect(sourceOf(settings, 'itemsMax')).toBe(RuleLimitSource.Variant);
  });

  test('a reset falls back to the variant rule’s number, not the core rules’', async () => {
    variants.enabled = [variantId('lavish')];
    await service.set(amiri, character.id, { limit: 'investedMax', value: setting(9) });
    const settings = await service.reset(amiri, character.id, 'investedMax');
    expect(settings.limits[0]).toMatchObject({ value: 12, custom: false, source: RuleLimitSource.Variant });
  });

  test('two variant rules that change one limit: the more permissive wins, whatever the order', async () => {
    variants.enabled = [variantId('lavish'), variantId('hoarder')];
    const forward = await service.of(character);
    variants.enabled = [variantId('hoarder'), variantId('lavish')];
    const backward = await service.of(character);
    expect<object>(forward).toStrictEqual({ ...CORE_RULE_LIMITS, investedMax: 12, itemsMax: 1000 });
    expect<object>(backward).toStrictEqual(forward);
  });

  test('a variant rule may lower a limit', async () => {
    variants.enabled = [variantId('one-handed')];
    expect<object>(await service.of(character)).toStrictEqual({ ...CORE_RULE_LIMITS, handsMax: 1 });
  });

  test('a variant rule no pack defines changes nothing', async () => {
    variants.enabled = [variantId('missing')];
    expect(await service.of(character)).toStrictEqual(CORE_RULE_LIMITS);
  });
});
