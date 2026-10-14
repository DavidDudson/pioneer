import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterName, PlayCommandField, untypedDamage } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, hitPointsContent, humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentLicense, ContentPack, ContentRegistry, HitPoints } from '@pioneer/rules/sdk';
import type { VariantRuleEntry } from '@pioneer/rules/sdk';
import { fixedClock, FIRST_VERSION, newId, UserId } from '@pioneer/shared/kernel';

import type { CharacterContentSource } from './character-content';
import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-14T10:00:00Z');

/** A variant rule that raises the maximum Hit Points by this much. */
const TOUGHER = 4;
const MORE_THAN_ANY_MAXIMUM = 100;

const registry = new ContentRegistry();
registry.register(hitPointsContent());
registry.register(
  ContentPack.define({
    manifest: { id: 'tougher', title: 'Tougher', publisher: 'Pioneer', license: ContentLicense.Homebrew },
    ancestries: [],
    creatures: [],
    variantRules: [
      {
        slug: 'variant-rule:tougher',
        name: 'Tougher',
        sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
        rules: [{ key: 'FlatModifier', type: 'untyped', value: TOUGHER, selectors: ['hp:max'] }],
      },
    ],
  }),
);

/** Content whose variant rules in force are whatever `enabled` holds. */
function content(enabled: readonly VariantRuleEntry[]): CharacterContentSource {
  return { registry: async () => registry, variantRules: async () => enabled };
}

describe('PlayService with variant rules', () => {
  let repository: InMemoryCharacterRepository;
  let kyra: Character;

  beforeEach(async () => {
    repository = new InMemoryCharacterRepository();
    kyra = await new CharacterService(repository, content([]), clock).create(amiri, {
      name: CharacterName.parse('Kyra'),
      ancestry: humanAncestryId,
    });
  });

  async function damageTaken(enabled: readonly VariantRuleEntry[]): Promise<HitPoints> {
    const play = new PlayService(repository, content(enabled), clock);
    const saved = await play.patch(amiri, kyra.id, {
      expectedRevision: FIRST_VERSION,
      command: { field: PlayCommandField.Damage, damage: untypedDamage(HitPoints.parse(MORE_THAN_ANY_MAXIMUM)) },
    });
    return saved.play.hp.damage;
  }

  test('without the variant, damage is held to the ancestry’s maximum', async () => {
    expect(await damageTaken([])).toBe(HUMAN_HIT_POINTS);
  });

  test('with the variant in force, the maximum the engine derives counts it', async () => {
    expect(await damageTaken(registry.variantRules())).toBe(HitPoints.parse(HUMAN_HIT_POINTS + TOUGHER));
  });
});
