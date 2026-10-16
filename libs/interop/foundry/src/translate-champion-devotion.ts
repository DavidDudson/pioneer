import { focusChoice, focusEntry } from './focus-plan';
import type { Planned } from './focus-plan';

export const CHAMPION = 'champion-focus';
export const CHAMPION_ENTRY = focusEntry({ slug: CHAMPION, tradition: 'divine', attribute: 'cha' });

const LAY_ON_HANDS = 'lay-on-hands';

/**
 * A devotion spell choice: Shields of the Spirit, or the spell of the deity's divine font (Lay on Hands for heal,
 * Touch of the Void for harm). Devotion Spells and Devout Magic offer the same options under their own flag.
 */
function devotionChoice(flag: string): Planned {
  return [
    CHAMPION_ENTRY,
    ...focusChoice({
      flag,
      prompt: 'Select a devotion spell.',
      entry: CHAMPION,
      options: [
        { value: 'shields-of-the-spirit', label: 'Shields of the Spirit', spells: ['shields-of-the-spirit'] },
        {
          value: LAY_ON_HANDS,
          label: 'Lay on Hands',
          spells: [LAY_ON_HANDS],
          predicate: ['deity:primary:font:heal'],
        },
        {
          value: 'touch-of-the-void',
          label: 'Touch of the Void',
          spells: ['touch-of-the-void'],
          predicate: ['deity:primary:font:harm'],
        },
      ],
    }),
  ];
}

/** A champion's devotion spell. */
export const DEVOTION_SPELLS_RULES: Planned = devotionChoice('devotion-spell');

/** Devout Magic: a devotion spell for the champion archetype, from the same options. */
export const DEVOUT_MAGIC_RULES: Planned = devotionChoice('devout-magic');

/** Blessed One Dedication: the Lay on Hands devotion spell, in the champion's entry. */
export const BLESSED_ONE_DEDICATION_RULES: Planned = [CHAMPION_ENTRY, { entry: CHAMPION, spells: [LAY_ON_HANDS] }];

/** Blessed Sacrifice: the Protector's Sacrifice domain spell as a devotion spell, which Player Core prints. */
export const BLESSED_SACRIFICE_RULES: Planned = [
  CHAMPION_ENTRY,
  { entry: CHAMPION, spells: ['player-core/protectors-sacrifice'] },
];
