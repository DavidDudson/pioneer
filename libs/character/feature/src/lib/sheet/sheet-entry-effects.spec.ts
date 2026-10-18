import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { EffectChange, EffectMode } from '@pioneer/rules/engine';
import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { sheetEntryEffects } from './sheet-entry-effects';

const pack = new ContentPackBuilder().withId('player-core').withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS);
pack.withItem(ContentKind.Sense, 'darkvision', { acuity: 'precise', unlimitedRange: true });
pack.withItem(ContentKind.Trait, 'cold-iron', { appliesTo: [ContentKind.Equipment] });
const darkvision = pack.idOf(ContentKind.Sense, 'darkvision');

/** A charm that gives darkvision and resistance 5 to physical damage, except from cold iron and from silver. */
function charm(exceptions: readonly string[]): ContentEntry {
  const built = new ContentPackBuilder().withId('player-core');
  built.withMagicItem(ContentKind.Equipment, 'night-charm', {
    data: { bulk: 'light', usage: { type: 'worn', slot: 'necklace' } },
    rules: [
      { key: 'Sense', sense: darkvision },
      { key: 'Resistance', type: ['physical'], value: 5, exceptions },
    ],
  });
  const entry = built.build().otherEntries.find(({ slug }) => slug.endsWith('night-charm'));
  if (entry === undefined) {
    throw new Error('The fixture charm is missing.');
  }
  return entry;
}

const registry = new ContentRegistry();
registry.register(pack.build());

describe(sheetEntryEffects, () => {
  const effects = sheetEntryEffects(registry, new CharacterBuilder().build(), {
    entry: charm(['cold-iron', 'silver']),
    mode: EffectMode.WouldApply,
  });

  it('names a sense by its entry', () => {
    const sense = effects.find(({ line }) => line.change === EffectChange.Sense);
    expect(sense?.sense).toBe('Darkvision');
  });

  it('names the exceptions the vocabulary names, and keeps the slug of one it does not', () => {
    const resistance = effects.find(({ line }) => line.change === EffectChange.Resistance);
    expect(resistance?.exceptions).toStrictEqual(['Cold-iron', 'silver']);
  });
});
