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

function classFeature({ id, name, level, traits }: Fixture, rules: readonly object[] = []): DocumentFixture {
  return {
    id,
    name,
    type: 'feat',
    pack: CLASS_FEATURES,
    system: {
      rules,
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

/** A class feat, as Foundry keeps one: Domain Initiate, Initiate Warden. */
function classFeat({ id, name, level, traits }: Fixture, rules: readonly object[] = []): DocumentFixture {
  return {
    id,
    name,
    type: 'feat',
    pack: FEATS,
    system: {
      rules,
      category: 'class',
      actionType: { value: 'passive' },
      actions: { value: FOUNDRY_NULL },
      level: { value: level },
      traits: { rarity: 'common', value: traits },
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
/** Its font `ChoiceSet`, as pf2e-8.6.0 has it: each font offered while the deity's font is it. */
const FOUNDRY_FONT_CHOICE = {
  key: 'ChoiceSet',
  flag: 'divineFont',
  prompt: 'PF2E.SpecificRule.Cleric.DivineFont.Prompt',
  rollOption: 'divine-font',
  choices: [
    {
      img: 'icons/magic/life/cross-worn-green.webp',
      label: 'PF2E.SpecificRule.Cleric.DivineFont.Healing',
      predicate: ['deity:primary:font:heal'],
      value: 'heal',
    },
    { label: 'PF2E.SpecificRule.Cleric.DivineFont.Harmful', predicate: ['deity:primary:font:harm'], value: 'harm' },
  ],
};

export const DIVINE_FONT = classFeature({ id: 'sPeLlCaStInG0009', name: 'Divine Font', level: 1, traits: ['cleric'] }, [
  FOUNDRY_FONT_CHOICE,
]);
export const SCHOOL_OF_BATTLE_MAGIC = classFeature({
  id: 'sPeLlCaStInG0010',
  name: 'School of Battle Magic',
  level: 1,
  traits: ['wizard'],
});
export const SCHOOL_OF_UNIFIED_MAGICAL_THEORY = classFeature({
  id: 'sPeLlCaStInG0011',
  name: 'School of Unified Magical Theory',
  level: 1,
  traits: ['wizard'],
});
export const BASIC_WIZARD_SPELLCASTING = archetypeFeat({
  id: 'sPeLlCaStInG0012',
  name: 'Basic Wizard Spellcasting',
  level: 4,
  traits: [],
});
export const MASTER_WIZARD_SPELLCASTING = archetypeFeat({
  id: 'sPeLlCaStInG0013',
  name: 'Master Wizard Spellcasting',
  level: 18,
  traits: [],
});
export const WITCH_SPELLCASTING = classFeature({
  id: 'sPeLlCaStInG0014',
  name: 'Witch Spellcasting',
  level: 1,
  traits: ['witch'],
});
export const SIGNATURE_SPELLS = classFeature({
  id: 'sPeLlCaStInG0015',
  name: 'Signature Spells',
  level: 3,
  traits: ['bard', 'oracle', 'psychic', 'sorcerer', 'summoner'],
});

/** Composition Spells: Counter Performance and Courageous Anthem, which `pf2e-8.6.0` grants by no rule element. */
export const COMPOSITION_SPELLS = classFeature({
  id: 'sPeLlCaStInG0016',
  name: 'Composition Spells',
  level: 1,
  traits: ['bard'],
});

/** Domain Initiate, with the `ChoiceSet` over the deity's domains Foundry gives it, which grants nothing. */
export const DOMAIN_INITIATE = classFeat(
  { id: 'sPeLlCaStInG0017', name: 'Domain Initiate', level: 1, traits: ['cleric'] },
  [
    {
      key: 'ChoiceSet',
      choices: 'system.details.deities.domains',
      flag: 'domainInitiate',
      prompt: 'PF2E.SpecificRule.Prompt.DeitysDomain',
    },
  ],
);

export const ADVANCED_DOMAIN = classFeat({
  id: 'sPeLlCaStInG0018',
  name: 'Advanced Domain',
  level: 8,
  traits: ['cleric'],
});

export const INITIATE_WARDEN = classFeat({
  id: 'sPeLlCaStInG0019',
  name: 'Initiate Warden',
  level: 1,
  traits: ['ranger'],
});

export const UNTAMED_ORDER = classFeature({
  id: 'sPeLlCaStInG0020',
  name: 'Untamed Order',
  level: 1,
  traits: ['druid'],
});

export const HEX_SPELLS = classFeature({ id: 'sPeLlCaStInG0021', name: 'Hex Spells', level: 1, traits: ['witch'] });

export const LESSON_OF_LIFE = classFeature({
  id: 'sPeLlCaStInG0022',
  name: 'Lesson of Life',
  level: 2,
  traits: ['witch'],
});

export const CACKLE = classFeat({ id: 'sPeLlCaStInG0023', name: 'Cackle', level: 1, traits: ['witch'] });
