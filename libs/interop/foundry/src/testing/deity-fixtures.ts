import type { DocumentFixture } from './import-fixtures';
import { FOUNDRY_NULL } from './kind-fixtures';

/** Player Core's Deity (Cleric), with the rule elements `pf2e-8.6.0` gives it. */

const CLASS_FEATURES = { name: 'classfeatures', directory: 'class-features' };

const SANCTIFICATION_CHOICE = {
  adjustName: false,
  choices: [
    {
      label: 'PF2E.TraitHoly',
      predicate: [{ or: ['deity:primary:sanctification:can:holy', 'deity:primary:sanctification:must:holy'] }],
      value: 'holy',
    },
    {
      label: 'PF2E.TraitUnholy',
      predicate: [{ or: ['deity:primary:sanctification:can:unholy', 'deity:primary:sanctification:must:unholy'] }],
      value: 'unholy',
    },
    {
      label: 'PF2E.NoneOption',
      predicate: [{ nor: ['deity:primary:sanctification:must:holy', 'deity:primary:sanctification:must:unholy'] }],
      value: 'none',
    },
  ],
  key: 'ChoiceSet',
  predicate: [{ nor: ['sanctification:none', 'sanctification:holy', 'sanctification:unholy'] }],
  prompt: 'PF2E.SpecificRule.Prompt.Sanctification',
  rollOption: 'sanctification',
  slug: 'sanctification',
};

export const DEITY_CLERIC: DocumentFixture = {
  id: 'DutW12WMFPHBoLTH',
  name: 'Deity (Cleric)',
  type: 'feat',
  pack: CLASS_FEATURES,
  system: {
    rules: [
      {
        choices: {
          filter: [{ or: ['item:category:deity', 'item:category:pantheon', 'item:category:covenant'] }],
          itemType: 'deity',
        },
        flag: 'deity',
        key: 'ChoiceSet',
        predicate: [{ not: 'deity' }],
        prompt: 'PF2E.SpecificRule.Prompt.Deity',
      },
      {
        allowDuplicate: false,
        key: 'GrantItem',
        predicate: [{ not: 'deity' }],
        uuid: '{item|flags.system.rulesSelections.deity}',
      },
      SANCTIFICATION_CHOICE,
      { add: ['holy'], key: 'ActorTraits', predicate: ['sanctification:holy'] },
      { add: ['unholy'], key: 'ActorTraits', predicate: ['sanctification:unholy'] },
      { fist: true, key: 'Strike', predicate: ['deity:primary:favored-weapon:fist'] },
      {
        key: 'ActiveEffectLike',
        mode: 'upgrade',
        path: 'flags.system.favoredWeaponRank',
        predicate: ['class:cleric'],
        value: 1,
      },
    ],
    category: 'classfeature',
    actionType: { value: 'passive' },
    actions: { value: FOUNDRY_NULL },
    level: { value: 1 },
    traits: { rarity: 'common', value: ['cleric'] },
  },
};

/** A warpriest's Third Doctrine, raising the favoured weapon rank to expert. */
export const THIRD_DOCTRINE_WARPRIEST: DocumentFixture = {
  id: 'Zp81uTBItG1xlH4O',
  name: 'Third Doctrine (Warpriest)',
  type: 'feat',
  pack: CLASS_FEATURES,
  system: {
    rules: [{ key: 'ActiveEffectLike', mode: 'upgrade', path: 'flags.system.favoredWeaponRank', value: 2 }],
    category: 'classfeature',
    actionType: { value: 'passive' },
    actions: { value: FOUNDRY_NULL },
    level: { value: 11 },
    traits: { rarity: 'common', value: ['cleric'] },
  },
};
