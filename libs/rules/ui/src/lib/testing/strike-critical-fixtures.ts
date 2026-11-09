import type { CriticalRange, CriticalWeakness, Strike } from '@pioneer/rules/engine';
import { ConditionValue, DamageAmount, Dc, DurationCount, Modifier, NaturalRoll } from '@pioneer/rules/sdk';
import type { Origin } from '@pioneer/rules/sdk';

const FLAME_WEAKNESS = DamageAmount.parse(5);
const FROST_SAVE_DC = Dc.parse(24);
/** Pacifying's penalty to attack rolls. */
const PACIFIED_PENALTY = Modifier.parse(-2);
const PACIFYING_SAVE_DC = Dc.parse(20);
const VORPAL_SAVE_DC = Dc.parse(37);
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
      {
        trigger: 'hit',
        reaction: true,
        effect: {
          kind: 'pacify',
          penalty: PACIFIED_PENALTY,
          duration: { type: 'time', count: DurationCount.parse(1), unit: 'minute' },
          save: { statistic: 'will', dc: PACIFYING_SAVE_DC },
        },
        origin,
      },
      {
        trigger: 'natural-twenty',
        reaction: true,
        effect: { kind: 'decapitate', save: { statistic: 'fortitude', dc: VORPAL_SAVE_DC } },
        origin,
      },
    ],
  };
}
