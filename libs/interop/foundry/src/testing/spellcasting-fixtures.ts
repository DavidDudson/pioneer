import type { DocumentFixture } from './import-fixtures';
import { FOUNDRY_NULL } from './kind-fixtures';

/** Player Core casters' class features and feats, shaped as `pf2e-8.6.0` has them: no spellcasting rule elements. */

const CLASS_FEATURES = { name: 'classfeatures', directory: 'class-features' };
const FEATS = { name: 'feats-srd', directory: 'feats' };

interface Fixture {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly traits: readonly string[];
}

function classFeature({ id, name, level, traits }: Fixture): DocumentFixture {
  return {
    id,
    name,
    type: 'feat',
    pack: CLASS_FEATURES,
    system: {
      category: 'classfeature',
      actionType: { value: 'passive' },
      actions: { value: FOUNDRY_NULL },
      level: { value: level },
      traits: { rarity: 'common', value: traits },
    },
  };
}

function archetypeFeat({ id, name, level, traits }: Fixture): DocumentFixture {
  return {
    id,
    name,
    type: 'feat',
    pack: FEATS,
    system: {
      category: 'class',
      actionType: { value: 'passive' },
      actions: { value: FOUNDRY_NULL },
      level: { value: level },
      traits: { rarity: 'common', value: ['archetype', ...traits] },
    },
  };
}

const DEDICATION = ['dedication', 'multiclass'];

export const WIZARD_SPELLCASTING = classFeature({
  id: 'sPeLlCaStInG0001',
  name: 'Wizard Spellcasting',
  level: 1,
  traits: ['wizard'],
});
export const CLERIC_SPELLCASTING = classFeature({
  id: 'sPeLlCaStInG0002',
  name: 'Cleric Spellcasting',
  level: 1,
  traits: ['cleric'],
});
export const THIRD_DOCTRINE = classFeature({
  id: 'sPeLlCaStInG0003',
  name: 'Third Doctrine (Cloistered Cleric)',
  level: 7,
  traits: ['cleric'],
});
export const THE_RESENTMENT = classFeature({
  id: 'sPeLlCaStInG0004',
  name: 'The Resentment',
  level: 1,
  traits: ['witch'],
});
export const WIZARD_DEDICATION = archetypeFeat({
  id: 'sPeLlCaStInG0005',
  name: 'Wizard Dedication',
  level: 2,
  traits: DEDICATION,
});
export const EXPERT_WIZARD_SPELLCASTING = archetypeFeat({
  id: 'sPeLlCaStInG0006',
  name: 'Expert Wizard Spellcasting',
  level: 12,
  traits: [],
});
export const WITCH_DEDICATION = archetypeFeat({
  id: 'sPeLlCaStInG0007',
  name: 'Witch Dedication',
  level: 2,
  traits: DEDICATION,
});
export const FIGHTER_FEATURE = classFeature({
  id: 'sPeLlCaStInG0008',
  name: 'Reactive Strike',
  level: 1,
  traits: ['fighter'],
});
