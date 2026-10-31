import { Truth } from '@pioneer/rules/predicate';
import { HitPoints, RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentId, GrantedShield, Hardness, HardnessBonus, Level, ShardDamage } from '@pioneer/rules/sdk';

import { battleFormInPlay } from './battle-form';
import { ruleIdOf } from './rule-in-play';
import type { ModifierInputs, RuleId } from './rule-in-play';
import { truthOf } from './rule-value';

/** A shield an effect gives that holds: what it has now, at the spell rank it was cast at. */
export interface ShieldInPlay {
  /** The rule that gives it, which names the shield for as long as the effect lasts. */
  readonly id: RuleId;
  /** The entry that gives it: the effect Shield Block can end. */
  readonly source: ContentId;
  readonly hardness: Hardness;
  /** Without Hit Points the shield takes no damage. */
  readonly hitPoints: HitPoints | undefined;
  /** At or below this many Hit Points the shield is broken; 0 for one that never is. Without Hit Points, 0. */
  readonly brokenThreshold: HitPoints;
  readonly endsOnBlock: boolean;
  readonly endsWhenDestroyed: boolean;
  /** The cast raised it, so it can block with no Raise a Shield. */
  readonly raised: boolean;
  /** Three layers, kept as the effect's badge, that blocks break. */
  readonly layered: boolean;
  /** A destroyed shield stays so until the spell that cast it is sustained. */
  readonly recreatedOnSustain: boolean;
  /** Extra Hardness against damage of some types. */
  readonly hardnessAgainst: readonly HardnessBonus[];
  /** The damage the shards deal when the block that ends the effect breaks it, at the rank it was cast at. */
  readonly shards: ShardDamage | undefined;
}

const BROKEN_DIVISOR = 2;
const NEVER_BROKEN = HitPoints.parse(0);

/** `shield` with each bracket that starts at or below `level` laid over it, lowest first; the base without a level. */
function heightened(shield: GrantedShield, level: Level | undefined): GrantedShield {
  const applying =
    level === undefined
      ? []
      : (shield.brackets ?? [])
          .filter(({ start }) => Number(start) <= Number(level))
          .toSorted((left, right) => Number(left.start) - Number(right.start));
  const result: { -readonly [Key in keyof GrantedShield]: GrantedShield[Key] } = { ...shield };
  for (const { hardness, hitPoints, brokenThreshold, shards } of applying) {
    if (shards !== undefined && result.shards !== undefined) {
      result.shards = { damageType: result.shards.damageType, damage: shards };
    }
    if (hardness !== undefined) {
      result.hardness = hardness;
    }
    if (hitPoints !== undefined) {
      result.hitPoints = hitPoints;
    }
    if (brokenThreshold !== undefined) {
      result.brokenThreshold = brokenThreshold;
    }
  }
  return result;
}

function inPlay(shield: GrantedShield, { id, source }: Pick<ShieldInPlay, 'id' | 'source'>): ShieldInPlay {
  const { hitPoints } = shield;
  const broken =
    hitPoints === undefined
      ? NEVER_BROKEN
      : (shield.brokenThreshold ?? HitPoints.parse(Math.floor(hitPoints / BROKEN_DIVISOR)));
  return {
    id,
    source,
    hardness: shield.hardness,
    hitPoints,
    brokenThreshold: broken,
    endsOnBlock: shield.endsOnBlock === true,
    endsWhenDestroyed: shield.endsWhenDestroyed === true,
    raised: shield.raised === true,
    layered: shield.layered === true,
    recreatedOnSustain: shield.recreatedOnSustain === true,
    hardnessAgainst: shield.hardnessAgainst ?? [],
    shards: shield.shards,
  };
}

/**
 * The shields the effects in play give: each `GrantShield` element whose predicate holds, heightened to the spell rank
 * of the item it sits on, and the shield of the battle form in force (its own, at the form's rank).
 */
export function shieldsInPlay(inputs: ModifierInputs): readonly ShieldInPlay[] {
  const granted = inputs.rules.flatMap((rule): ShieldInPlay[] => {
    const { element } = rule;
    if (element.key !== RuleElementKey.GrantShield || truthOf(element.predicate, inputs.facts) !== Truth.True) {
      return [];
    }
    return [inPlay(heightened(element, rule.itemLevel), { id: ruleIdOf(rule), source: rule.origin.entry })];
  });
  const form = battleFormInPlay(inputs);
  const shield = form?.form.shield;
  return form === undefined || shield === undefined
    ? granted
    : [...granted, inPlay(shield, { id: form.id, source: form.origin.entry })];
}
