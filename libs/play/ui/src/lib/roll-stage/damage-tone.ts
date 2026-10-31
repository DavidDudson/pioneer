import { DamageTone } from '@pioneer/frontier';
import { DamageType } from '@pioneer/rules/sdk';

/** The colour each damage type's dice and total take. The three physical types share one, as precision follows its weapon. */
export const DAMAGE_TYPE_TONES: Readonly<Record<DamageType, DamageTone>> = {
  [DamageType.Bludgeoning]: DamageTone.Physical,
  [DamageType.Piercing]: DamageTone.Physical,
  [DamageType.Slashing]: DamageTone.Physical,
  [DamageType.Precision]: DamageTone.Physical,
  [DamageType.Acid]: DamageTone.Acid,
  [DamageType.Cold]: DamageTone.Cold,
  [DamageType.Electricity]: DamageTone.Electricity,
  [DamageType.Fire]: DamageTone.Fire,
  [DamageType.Sonic]: DamageTone.Sonic,
  [DamageType.Vitality]: DamageTone.Vitality,
  [DamageType.Void]: DamageTone.Void,
  [DamageType.Force]: DamageTone.Force,
  [DamageType.Spirit]: DamageTone.Spirit,
  [DamageType.Mental]: DamageTone.Mental,
  [DamageType.Poison]: DamageTone.Poison,
  [DamageType.Bleed]: DamageTone.Bleed,
};

/** The tone of a damage type, or undefined for an untyped roll. */
export function damageTone(type: DamageType | undefined): DamageTone | undefined {
  return type === undefined ? undefined : DAMAGE_TYPE_TONES[type];
}
