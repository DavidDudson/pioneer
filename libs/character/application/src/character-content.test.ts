import { describe, expect, test } from 'bun:test';

import { CharacterName, PackPublisher, PackTitle } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { contentPackId, ContentRegistry, PackId } from '@pioneer/rules/sdk';
import type { ContentId, ContentPackId, ContentSource, VariantRuleId } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

import { CharacterContent } from './character-content';
import { CharacterService } from './character-service';
import { EffectivePacks } from './effective-packs';
import type { EffectiveVariants } from './effective-variants';
import { HeldContentPacks } from './held-content-packs';
import { InMemoryCharacterPackCatalog } from './in-memory-character-pack-catalog';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import type { PackLookup } from './pack-lookup';

const amiri = UserId.parse(newId());
const BREW = PackId.parse('held-brew');
const LIVE = PackId.parse('live-brew');
const brew = contentPackId(BREW);
const live = contentPackId(LIVE);
const brewPack = new ContentPackBuilder().withId(BREW).withVariantRule('gritty').build();
const livePack = new ContentPackBuilder().withId(LIVE).build();

class InForce extends EffectivePacks {
  public ids: readonly ContentPackId[] = [];

  public override async of(): Promise<readonly ContentPackId[]> {
    return this.ids;
  }
}

const enabled: EffectiveVariants = {
  of: async (): Promise<readonly VariantRuleId[]> => {
    const registry = new ContentRegistry();
    registry.register(brewPack);
    return registry.variantRules().map((entry) => entry.id);
  },
};

const holdsBrew: PackLookup = {
  packsOf: async (entryIds: readonly ContentId[]): Promise<readonly ContentPackId[]> =>
    entryIds.length === 0 ? [] : [brew],
};

interface Built {
  readonly content: CharacterContent;
  readonly packs: InForce;
  readonly source: Packs;
}

/** Registers the packs asked for over a core pack, and records what was asked. */
class Packs implements ContentSource {
  public asked: readonly ContentPackId[] = [];

  public async registry(packs: readonly ContentPackId[] = []): Promise<ContentRegistry> {
    this.asked = packs;
    const registry = new ContentRegistry();
    registry.register(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    for (const pack of [brewPack, livePack]) {
      if (packs.includes(contentPackId(pack.id))) {
        registry.register(pack);
      }
    }
    return registry;
  }
}

async function kyra(): Promise<Character> {
  const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
  const service = new CharacterService(
    new InMemoryCharacterRepository(),
    fixedContent(core),
    fixedClock('2026-10-16T10:00:00Z'),
  );
  return service.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
}

function build(options: { readonly readable: boolean }): Built {
  const catalog = new InMemoryCharacterPackCatalog().pack({
    id: brew,
    title: PackTitle.parse('Brew'),
    publisher: PackPublisher.parse('Ezren'),
    readers: options.readable ? [amiri] : [],
  });
  const source = new Packs();
  const packs = new InForce();
  const held = new HeldContentPacks(holdsBrew, catalog);
  return { content: new CharacterContent(source, packs, { variants: enabled, held }), packs, source };
}

describe('CharacterContent with held packs', () => {
  test('keeps a held pack that is not in force in the registry, as unsupported', async () => {
    const { content, packs, source } = build({ readable: true });
    packs.ids = [live];
    const character = await kyra();

    await content.forCharacter(character).registry();

    expect([...source.asked].toSorted()).toEqual([brew, live].toSorted());
    expect(await content.unsupportedPacks(character)).toStrictEqual([brew]);
  });

  test('a held pack in force is supported', async () => {
    const { content, packs } = build({ readable: true });
    packs.ids = [brew];

    expect(await content.unsupportedPacks(await kyra())).toStrictEqual([]);
  });

  test('a held pack its owner may no longer read is left out', async () => {
    const { content, source } = build({ readable: false });
    const character = await kyra();

    await content.forCharacter(character).registry();

    expect(source.asked).toStrictEqual([]);
    expect(await content.unsupportedPacks(character)).toStrictEqual([]);
  });

  test('drops a variant rule of an unsupported pack', async () => {
    const { content } = build({ readable: true });

    expect(await content.variantRules(await kyra())).toStrictEqual([]);
  });
});
