import { describe, expect, test } from 'bun:test';

import { CharacterName } from '@pioneer/character/domain';
import { humanAncestryId, hitPointsContent } from '@pioneer/character/domain/testing';
import { ContentPackId } from '@pioneer/rules/sdk';
import type { ContentRegistry, ContentSource } from '@pioneer/rules/sdk';
import { fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

import { CharacterContent } from './character-content';
import { CharacterService } from './character-service';
import { EffectivePacks } from './effective-packs';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-14T10:00:00Z');
const brew = ContentPackId.parse(newId());

/** A content source that remembers which packs each ask named. */
function recordingContent(asked: (readonly ContentPackId[] | undefined)[]): ContentSource {
  const official = fixedContent(hitPointsContent());
  return {
    registry: async (packs): Promise<ContentRegistry> => {
      asked.push(packs);
      return official.registry();
    },
  };
}

class FixedPacks extends EffectivePacks {
  readonly #packs: readonly ContentPackId[];

  public constructor(packs: readonly ContentPackId[]) {
    super();
    this.#packs = packs;
  }

  public override async of(): Promise<readonly ContentPackId[]> {
    return this.#packs;
  }
}

async function sheetAsked(packs: EffectivePacks): Promise<(readonly ContentPackId[] | undefined)[]> {
  const asked: (readonly ContentPackId[] | undefined)[] = [];
  const service = new CharacterService(
    new InMemoryCharacterRepository(),
    new CharacterContent(recordingContent(asked), packs),
    clock,
  );
  const kyra = await service.create(amiri, {
    name: CharacterName.parse('Kyra'),
    ancestry: humanAncestryId,
  });
  asked.length = 0;
  await service.sheet(kyra);
  return asked;
}

describe('the content a character is worked out over', () => {
  test('includes the homebrew packs the character uses', async () => {
    expect(await sheetAsked(new FixedPacks([brew]))).toStrictEqual([[brew]]);
  });

  test('asks for no homebrew packs of a character that uses none', async () => {
    expect(await sheetAsked(new FixedPacks([]))).toStrictEqual([[]]);
  });
});
