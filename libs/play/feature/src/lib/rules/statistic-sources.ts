import { InjectionToken } from '@angular/core';
import { contentCatalog } from '@pioneer/rules/catalog';
import { statisticContent, variantRulesInPlay } from '@pioneer/rules/engine';
import type { RuleInPlay } from '@pioneer/rules/engine';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import { contentId, ContentRegistry, PackId, Slug, VariantRuleId } from '@pioneer/rules/sdk';
import type { ProficiencyBonusTable } from '@pioneer/rules/sdk';
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
async function statisticDefinitions(source: StatisticSource): Promise<string> {
  if (source === StatisticSource.Example) {
    return rulesExample(RulesTool.Statistics);
  }
  const id = SOURCE_PACKS[source];
  const loader = contentCatalog.find((candidate) => candidate.id === id);
  if (loader === undefined) {
    throw new Error(`No content pack "${id}" in the catalog`);
  }
  const pack = await loader.load();
  // The tool edits definitions alone; a pack's statistics also carry their sources.
  const definitions = pack.statistics.map(({ sources: _sources, ...definition }) => definition);
  return JSON.stringify(definitions, undefined, JSON_INDENT);
}

/** Loads a source's definitions as JSON. */
export type LoadStatisticDefinitions = (source: StatisticSource) => Promise<string>;

/** How the statistics tool loads a source's definitions: from the catalog. Specs provide a scripted loader. */
export const STATISTIC_DEFINITIONS = new InjectionToken<LoadStatisticDefinitions>('STATISTIC_DEFINITIONS', {
  providedIn: 'root',
  factory: (): LoadStatisticDefinitions => statisticDefinitions,
});

/** A variant rule's name and its rule elements in play, for a toggle that enables it. */
export interface VariantInPlay {
  readonly name: string;
  readonly rules: readonly RuleInPlay[];
}

/**
 * What the tools read from the core rules pack: the proficiency bonus table and the variant that replaces it, for
 * statistics, and the roll option namespaces every tool that tests predicates reads.
 */
export interface CoreRules {
  readonly table: ProficiencyBonusTable;
  readonly withoutLevel: VariantInPlay;
  readonly namespaces: NamespaceTable;
}

const CORE_RULES_PACK = PackId.parse('core-rules');
const WITHOUT_LEVEL = Slug.parse('proficiency-without-level');

/** The core rules pack's proficiency bonus table, Proficiency Without Level and namespaces, read through a registry. */
async function loadCoreRules(): Promise<CoreRules> {
  const loader = contentCatalog.find((candidate) => candidate.id === CORE_RULES_PACK);
  if (loader === undefined) {
    throw new Error(`No content pack "${CORE_RULES_PACK}" in the catalog`);
  }
  const registry = new ContentRegistry();
  await registry.load(loader);
  const content = statisticContent(registry);
  const variant = registry.variantRule(VariantRuleId.parse(contentId(CORE_RULES_PACK, WITHOUT_LEVEL)));
  if (content === undefined || variant === undefined) {
    throw new Error('The core rules pack has no proficiency bonus table or no Proficiency Without Level');
  }
  return {
    table: content.proficiencyBonus,
    withoutLevel: { name: variant.definition.name, rules: variantRulesInPlay([variant]) },
    namespaces: registry.rollOptionNamespaces(),
  };
}

/** Loads what the tools read from the core rules pack. */
export type LoadCoreRules = () => Promise<CoreRules>;

/** How the tools load the core rules: from the core rules pack in the catalog. Specs provide them. */
export const CORE_RULES = new InjectionToken<LoadCoreRules>('CORE_RULES', {
  providedIn: 'root',
  factory: (): LoadCoreRules => loadCoreRules,
});
