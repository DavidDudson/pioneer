import type { SpellAtRank, SpellCast } from '@pioneer/rules/engine';
import { CastTimeType, targetValues } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import type { SpellCostLine, SpellDetailLine, SpellFieldsLine, SpellVariantLine } from './spell-detail-line';
import { SPELL_TIME_UNIT_MESSAGES } from './spell-list-messages';
import { areaText, defenceText, durationText, effectLines, rangeText, targetsText } from './spell-text';
import type { Translate } from './spell-text';

/** What a spell is called and tagged in the list: its id and name, and a message key per badge. */
export interface SpellIdentity {
  readonly id: ContentId;
  readonly name: string;
  readonly tags: readonly string[];
}

function costOf(time: SpellCast['time'], translate: Translate): SpellCostLine {
  return time.type === CastTimeType.Actions
    ? { kind: 'actions', cost: time.cost, upTo: time.upTo }
    : { kind: 'time', text: translate(SPELL_TIME_UNIT_MESSAGES[time.unit], { count: time.count }) };
}

function fieldsOf(cast: SpellCast, translate: Translate): SpellFieldsLine {
  return {
    cost: costOf(cast.time, translate),
    range: rangeText(cast.range, translate),
    area: areaText(cast.area, translate),
    targets: targetsText(cast.targets, translate),
    defence: defenceText(cast.defense, translate),
    duration: durationText(cast.duration, translate),
    effects: effectLines(cast.damage, translate),
  };
}

/** A spell's fields at the rank it is cast, and each variant's under its name. */
export interface SpellCastLine extends SpellFieldsLine {
  readonly variants: readonly SpellVariantLine[];
}

/** `cast` worded: its fields, and each variant the same way under its name (`name` where it has none). */
export function spellCastLine(cast: SpellAtRank, name: string, translate: Translate): SpellCastLine {
  return {
    ...fieldsOf(cast, translate),
    variants: cast.variants.map((variant) => ({ ...fieldsOf(variant, translate), name: variant.name ?? name })),
  };
}

/**
 * A spell worded for the list at the rank it is cast: its casting time as glyphs or a span, and its range, area, targets,
 * defence, damage or healing and duration from `cast`'s structured fields, each variant the same way under its name.
 */
export function spellDetailLine(who: SpellIdentity, cast: SpellAtRank, translate: Translate): SpellDetailLine {
  return {
    ...spellCastLine(cast, who.name, translate),
    id: who.id,
    name: who.name,
    rank: cast.rank,
    targetValues: targetValues(cast),
    counteract: cast.counteraction,
    tags: who.tags,
  };
}
