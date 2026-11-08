import type { CriticalRange, CriticalWeakness, Strike } from '@pioneer/rules/engine';
import { ConditionValue, DamageAmount, Dc, NaturalRoll } from '@pioneer/rules/sdk';
import type { Origin } from '@pioneer/rules/sdk';

const FLAME_WEAKNESS = DamageAmount.parse(5);
const FROST_SAVE_DC = Dc.parse(24);
const KEEN_NATURAL = NaturalRoll.parse(19);

/** What a critical hit changes in a Strike that `origin` gives: fire weakness, a Slowed 1 effect with a save, a 19 range. */
export function criticalsFrom(origin: Origin): Pick<Strike, 'criticalEffects' | 'criticalRange' | 'weaknesses'> {
  const weakness: CriticalWeakness = { damageType: 'fire', amount: FLAME_WEAKNESS, origin };
  const range: CriticalRange = { natural: KEEN_NATURAL, origin };
  return {
    weaknesses: [weakness],
    criticalRange: range,
    criticalEffects: [
      {
        effect: {
          kind: 'condition',
          condition: 'slowed',
          value: ConditionValue.parse(1),
          duration: { type: 'next-turn-end' },
          save: { statistic: 'fortitude', dc: FROST_SAVE_DC },
        },
        origin,
      },
    ],
  };
}
