import { contentCatalog } from '@pioneer/rules/catalog';
import { PackId } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { rulesExample, RulesTool } from './rules-check';

const JSON_INDENT = 2;

/** Where the statistics tool's definitions come from: the tool's example, or a content pack's statistics. */
export const StatisticSource = { Example: 'example', CoreRules: 'core-rules' } as const;
export type StatisticSource = ValueOf<typeof StatisticSource>;

export const STATISTIC_SOURCE_KEYS: Readonly<Record<StatisticSource, string>> = {
  [StatisticSource.Example]: 'play.rules.statisticSource.example',
  [StatisticSource.CoreRules]: 'play.rules.statisticSource.coreRules',
};

/** The pack each pack source loads from the catalog. */
const SOURCE_PACKS: Readonly<Record<Exclude<StatisticSource, typeof StatisticSource.Example>, PackId>> = {
  [StatisticSource.CoreRules]: PackId.parse('core-rules'),
};

/** The definitions `source` gives, as the JSON the statistics tool reads. A pack is loaded on first use. */
export async function statisticDefinitions(source: StatisticSource): Promise<string> {
  if (source === StatisticSource.Example) {
    return rulesExample(RulesTool.Statistics);
  }
  const id = SOURCE_PACKS[source];
  const loader = contentCatalog.find((candidate) => candidate.id === id);
  if (loader === undefined) {
    throw new Error(`No content pack "${id}" in the catalog`);
  }
  const pack = await loader.load();
  return JSON.stringify(pack.statistics, undefined, JSON_INDENT);
}
