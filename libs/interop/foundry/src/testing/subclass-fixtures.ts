import type { DocumentFixture } from './import-fixtures';
import { FOUNDRY_NULL } from './kind-fixtures';

/** A subclass feature and one of its options, shaped as `pf2e-8.6.0` has every Player Core one. */

const CLASS_FEATURES = { name: 'classfeatures', directory: 'class-features' };

/** A subclass choice as Foundry writes every Player Core one: a tag filter and a grant of the pick by its flag. */
export const DOCTRINE: DocumentFixture = {
  id: 'cLaSsFeAtUrE0003',
  name: 'Doctrine',
  type: 'feat',
  pack: CLASS_FEATURES,
  system: {
    category: 'classfeature',
    actionType: { value: 'passive' },
    actions: { value: FOUNDRY_NULL },
    level: { value: 1 },
    rules: [
      {
        adjustName: false,
        choices: { filter: ['item:tag:cleric-doctrine'] },
        flag: 'clericDoctrine',
        key: 'ChoiceSet',
        prompt: 'PF2E.SpecificRule.Cleric.Doctrine.Prompt',
      },
      { key: 'GrantItem', uuid: '{item|flags.system.rulesSelections.clericDoctrine}' },
    ],
    traits: { rarity: 'common', value: ['cleric'] },
  },
};

/** One of the doctrines `DOCTRINE` offers, by its tag. */
export const CLOISTERED_CLERIC: DocumentFixture = {
  id: 'cLaSsFeAtUrE0004',
  name: 'Cloistered Cleric',
  type: 'feat',
  pack: CLASS_FEATURES,
  system: {
    category: 'classfeature',
    actionType: { value: 'passive' },
    actions: { value: FOUNDRY_NULL },
    level: { value: 1 },
    traits: { otherTags: ['cleric-doctrine'], rarity: 'common', value: ['cleric'] },
  },
};
