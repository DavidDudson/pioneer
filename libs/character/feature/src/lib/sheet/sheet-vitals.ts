import type { Character } from '@pioneer/character/domain';
import { Proficiency, Selector, StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { VitalBasisKind } from '@pioneer/rules/ui';
import type { NamedStatistic, Vital, VitalBasis } from '@pioneer/rules/ui';

import { statisticInputsOf } from './sheet-inputs';

const AC = Selector.parse('ac');

/** What the engine derived for the sheet, which the vitals row shows. */
export interface VitalReads {
  /** AC, the saves and Perception, in display order. */
  readonly statistics: readonly NamedStatistic[];
  /** Display names of entries, the worn armour's among them. */
  readonly entryNames: ReadonlyMap<ContentId, string>;
}

/** What sets Armor Class: the worn armour, by the name the sheet knows it by, or none. */
function armorBasis(registry: ContentRegistry, character: Character, reads: VitalReads): VitalBasis {
  const { armor } = statisticInputsOf(registry, character);
  const name = armor === undefined ? undefined : reads.entryNames.get(armor.origin.entry);
  return name === undefined ? { kind: VitalBasisKind.Unarmored } : { kind: VitalBasisKind.Armor, name };
}

/**
 * The vitals row: the sheet's statistics (AC, saves, Perception) each with the rank its proficiency bonus reads, and
 * for Armor Class the armour that sets it. A statistic the character has no rank in is untrained; a plain value, as a
 * Speed is, has no rank.
 */
export function sheetVitals(registry: ContentRegistry, character: Character, reads: VitalReads): readonly Vital[] {
  const { ranks } = statisticInputsOf(registry, character);
  return reads.statistics.map((statistic): Vital => {
    const { selector } = statistic.result;
    if (statistic.kind === StatisticKind.Value) {
      return { statistic, rank: undefined };
    }
    const rank = ranks.get(selector) ?? Proficiency.Untrained;
    return selector === AC ? { statistic, rank, basis: armorBasis(registry, character, reads) } : { statistic, rank };
  });
}
