import { archetypeFeat } from './spellcasting-fixtures';

/** Player Core 2's archetype feats that grant focus spells, shaped as `pf2e-8.6.0` has them: no rule elements. */

const DEDICATION = ['dedication', 'multiclass'];

export const SORCERER_DEDICATION = archetypeFeat({
  id: 'sPeLlCaStInG0050',
  name: 'Sorcerer Dedication',
  level: 2,
  traits: DEDICATION,
});
export const BASIC_BLOODLINE_SPELL = archetypeFeat({
  id: 'sPeLlCaStInG0051',
  name: 'Basic Bloodline Spell',
  level: 4,
  traits: [],
});
export const ORACLE_DEDICATION = archetypeFeat({
  id: 'sPeLlCaStInG0052',
  name: 'Oracle Dedication',
  level: 2,
  traits: DEDICATION,
});
export const FIRST_REVELATION = archetypeFeat({
  id: 'sPeLlCaStInG0053',
  name: 'First Revelation',
  level: 4,
  traits: [],
});
