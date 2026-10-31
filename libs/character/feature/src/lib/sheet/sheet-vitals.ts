import { PERCEPTION } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { Proficiency, Selector, StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { VitalBasisKind } from '@pioneer/rules/ui';
import type { NamedStatistic, Vital, VitalBasis } from '@pioneer/rules/ui';

import { statisticInputsOf } from './sheet-inputs';
import { sheetSpellcasting } from './sheet-spellcasting';

const AC = Selector.parse('ac');
const SPELL_DC = 'spell-dc:';

/** What the engine derived for the sheet, which the vitals row shows. */
export interface VitalReads {
  /** AC, the saves, Perception and the class DC, in display order. */
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
 * The vitals row: the sheet's statistics (AC, saves, Perception, class DC) each with the rank its proficiency bonus reads, and
 * for Armor Class the armour that sets it. A statistic the character has no rank in is untrained; a plain value, as a
 * Speed is, has no rank.
 */
export function sheetVitals(registry: ContentRegistry, character: Character, reads: VitalReads): readonly Vital[] {
  const { ranks } = statisticInputsOf(registry, character);
  const own = reads.statistics
    // Perception is a row of the Skills panel, not a vital.
    .filter(({ result }) => result.selector !== PERCEPTION)
    .map((statistic): Vital => {
      const { selector } = statistic.result;
      if (statistic.kind === StatisticKind.Value) {
        return { statistic, rank: undefined };
      }
      const rank = ranks.get(selector) ?? Proficiency.Untrained;
      return selector === AC ? { statistic, rank, basis: armorBasis(registry, character, reads) } : { statistic, rank };
    });
  return [...own, ...spellDcVitals(registry, character)];
}

/**
 * The spell DC of the character's spellcasting: one when every entry gives the same value, else one for each entry,
 * named by its source. It has no rank: the sheet reads none for spellcasting yet.
 */
function spellDcVitals(registry: ContentRegistry, character: Character): readonly Vital[] {
  const entries = sheetSpellcasting(registry, character);
  const found = entries.flatMap(({ source, statistics }) =>
    statistics.filter(({ result }) => result.selector.startsWith(SPELL_DC)).map((statistic) => ({ source, statistic })),
  );
  const [first] = found;
  if (
    first !== undefined &&
    found.every(
      ({ statistic }) =>
        statistic.result.ok && first.statistic.result.ok && statistic.result.total === first.statistic.result.total,
    )
  ) {
    return [{ statistic: first.statistic, rank: undefined }];
  }
  return found.map(({ source, statistic }): Vital => ({
    statistic: { ...statistic, name: `${statistic.name} · ${source}` },
    rank: undefined,
  }));
}
