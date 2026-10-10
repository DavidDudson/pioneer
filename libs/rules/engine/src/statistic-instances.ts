import { Domain, Selector, StatisticPer } from '@pioneer/rules/sdk';
import type { AttributeModifiers, Slug, StatisticDefinition } from '@pioneer/rules/sdk';

import { sourceAttribute } from './source-inputs';
import type { SourceInputs } from './source-inputs';
import type { StatisticInputs } from './statistic-inputs';

/**
 * A statistic as the graph evaluates it: a definition derived once, or one weapon's or spellcasting entry's
 * instance of a definition derived per source, with the source its base formula reads.
 */
export interface StatisticInstance {
  /** For an instance: the family's definition under `<selector>:<source slug>`, keyed to the source's attribute. */
  readonly definition: StatisticDefinition;
  readonly source: SourceInputs | undefined;
  /**
   * The statistic a `@stat.<selector>` in the base formula reads. In an instance, a selector naming another family
   * derived per the same kind of source reads that family's instance for the same source: a spell DC's
   * `@stat.spell-attack` reads its own entry's spell attack.
   */
  readonly reads: (selector: Selector) => Selector;
}

const SEPARATOR = ':';
const ATTRIBUTE_DOMAIN_SUFFIX = '-based';

function same(selector: Selector): Selector {
  return selector;
}

/** The character's weapons or spellcasting entries, as the sources a family derived per them is derived for. */
function sourcesOf(per: StatisticPer, inputs: StatisticInputs): readonly SourceInputs[] {
  return per === StatisticPer.Weapon
    ? (inputs.weapons ?? []).map((weapon) => ({ per, weapon }))
    : (inputs.spellcasting ?? []).map((entry) => ({ per, entry }));
}

function slugOf(source: SourceInputs): Slug {
  return source.per === StatisticPer.Weapon ? source.weapon.slug : source.entry.slug;
}

/** The family's definition for one source: its own selector, the source's attribute and that attribute's domain. */
function instanceOf(
  family: StatisticDefinition,
  source: SourceInputs,
  attributes: AttributeModifiers,
): StatisticDefinition | undefined {
  const selector = Selector.safeParse(`${family.selector}${SEPARATOR}${slugOf(source)}`);
  if (!selector.success) {
    return undefined;
  }
  const keyAttribute = sourceAttribute(source, attributes);
  const domain = Domain.parse(`${keyAttribute}${ATTRIBUTE_DOMAIN_SUFFIX}`);
  const domains = family.domains.includes(domain) ? family.domains : [...family.domains, domain];
  return { ...family, selector: selector.data, domains, keyAttribute };
}

/**
 * Every statistic to evaluate. A definition without `per` is one statistic. One derived per weapon or spellcasting
 * entry becomes one instance per weapon or entry the character has, `<selector>:<source slug>` (`strike:longsword`),
 * keyed to the source's attribute and in that attribute's `<attribute>-based` domain; with none, it has no
 * instances. A later definition of a selector replaces an earlier one before instances are made, and statistics come
 * out in the order their definitions were last given, so where an instance and a plain statistic share a selector
 * (`strike:longsword`), the one given later wins. Family selectors and source slugs are bounded so an instance's
 * selector always is one; the check here only guards definitions built without their schema.
 */
export function statisticInstances(
  definitions: readonly StatisticDefinition[],
  inputs: StatisticInputs,
): readonly StatisticInstance[] {
  const lastGiven = new Map(definitions.map(({ selector }, index) => [selector, index]));
  const latest = definitions.filter(({ selector }, index) => lastGiven.get(selector) === index);
  const families = new Map<StatisticPer, ReadonlySet<Selector>>(
    Object.values(StatisticPer).map((per) => [
      per,
      new Set(latest.filter((definition) => definition.per === per).map(({ selector }) => selector)),
    ]),
  );
  return latest.flatMap((family): StatisticInstance[] => {
    if (family.per === undefined) {
      return [{ definition: family, source: undefined, reads: same }];
    }
    const siblings = families.get(family.per) ?? new Set<Selector>();
    return sourcesOf(family.per, inputs).flatMap((source) => {
      const definition = instanceOf(family, source, inputs.attributes);
      const slug = slugOf(source);
      const reads = (selector: Selector): Selector => {
        const sibling = Selector.safeParse(`${selector}${SEPARATOR}${slug}`);
        return siblings.has(selector) && sibling.success ? sibling.data : selector;
      };
      return definition === undefined ? [] : [{ definition, source, reads }];
    });
  });
}
