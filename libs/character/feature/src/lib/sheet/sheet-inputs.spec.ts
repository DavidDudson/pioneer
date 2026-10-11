import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { AncestryId, ContentRegistry, Feet, HitPoints } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { statisticInputsOf } from './sheet-inputs';

const pack = new ContentPackBuilder().withId('player-core').withAncestry('dwarf', { hitPoints: 10, speed: 20 });
const registry = new ContentRegistry();
registry.register(pack.build());

describe(statisticInputsOf, () => {
  it('gives the engine the picked ancestry’s Hit Points and speed', () => {
    const dwarf = new CharacterBuilder().withAncestry(AncestryId.parse(pack.idOf('ancestry', 'dwarf'))).build();
    expect(statisticInputsOf(registry, dwarf).ancestry).toStrictEqual({
      hitPoints: HitPoints.parse(10),
      speed: Feet.parse(20),
    });
  });

  it('gives no ancestry inputs while the ancestry is not loaded', () => {
    const elf = new CharacterBuilder().withAncestry(AncestryId.parse(pack.idOf('ancestry', 'elf'))).build();
    expect(statisticInputsOf(registry, elf).ancestry).toBeUndefined();
  });
});
