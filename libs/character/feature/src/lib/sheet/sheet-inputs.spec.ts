import { CharacterBuilder, playerCoreClasses, playerCoreClassId } from '@pioneer/character/domain/testing';
import { AncestryId, ContentRegistry, Feet, HitPoints, Selector } from '@pioneer/rules/sdk';
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

describe('statisticInputsOf a class', () => {
  const classes = new ContentRegistry();
  classes.register(playerCoreClasses());

  it('gives the engine the class’s Hit Points, key attribute and starting ranks', () => {
    const cleric = new CharacterBuilder().picking('class', playerCoreClassId('cleric')).build();
    const inputs = statisticInputsOf(classes, cleric);
    expect(inputs.class).toStrictEqual({ hitPoints: HitPoints.parse(8), keyAttribute: 'wis' });
    expect(inputs.ranks.get(Selector.parse('save:will'))).toBe('expert');
    expect(inputs.ranks.get(Selector.parse('class-dc'))).toBe('trained');
    expect(inputs.ranks.get(Selector.parse('ac'))).toBe('trained');
  });

  it('gives no class inputs and no ranks before a class is picked', () => {
    const inputs = statisticInputsOf(classes, new CharacterBuilder().build());
    expect(inputs.class).toBeUndefined();
    expect(inputs.ranks.size).toBe(0);
  });
});
