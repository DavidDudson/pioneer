import * as z from 'zod';

import { resolveUuid } from './entry-references';
import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { boundedRecord, setFields, systemOf } from './kind-fields';

/**
 * A deity's `data` from Foundry's `deity` item. Foundry's field names are singular (`attribute`, `skill`) and its
 * spells are keyed by rank; values Foundry and Pioneer spell alike (categories, domains, fonts, sanctification,
 * base weapons) carry over and the schema checks them. Its edicts and anathema are its description.
 */

export const DEITY_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  'attribute',
  'category',
  'domains',
  'font',
  'sanctification',
  'skill',
  'spells',
  'weapons',
]);

const FIELD_MAX = 64;
const NAME_MAX = 500;
const LIST_MAX = 32;

const Slugs = z.array(z.string().max(FIELD_MAX)).max(LIST_MAX);

const FoundryDeitySystem = z.looseObject({
  category: z.string().max(FIELD_MAX),
  sanctification: z.looseObject({ modal: z.string().max(FIELD_MAX), what: Slugs }).nullish(),
  domains: z.looseObject({ primary: Slugs.default([]), alternate: Slugs.default([]) }),
  font: Slugs.default([]),
  attribute: Slugs.default([]),
  skill: Slugs.nullish(),
  weapons: Slugs.default([]),
  spells: boundedRecord(z.string().max(NAME_MAX)).default({}),
});

/**
 * Domains some deities name by their remaster label rather than Foundry's config key, which the remaster kept:
 * Disorientation is `delirium`, Nothingness `void` and Dragon `wyrmkin`. Foundry shows such a domain by its raw
 * name; Pioneer files it under the key, so a deity offers one domain whichever name it uses.
 */
const DOMAIN_KEYS: Readonly<Record<string, string>> = { disorientation: 'delirium', dragon: 'wyrmkin', nothingness: 'void' };

function domainKeys(domains: readonly string[]): string[] {
  return [...new Set(domains.map((domain) => DOMAIN_KEYS[domain] ?? domain))];
}

interface DeitySpell {
  readonly rank: number;
  readonly spell: string;
}

/** One spell per rank, in rank order, each by content id; a UUID naming no entry is reported. */
function spellsOf(spells: Readonly<Record<string, string>>, { references, log }: KindInput): DeitySpell[] {
  return Object.entries(spells)
    .toSorted(([left], [right]) => Number(left) - Number(right))
    .flatMap(([rank, uuid]) => {
      const spell = resolveUuid(references, uuid);
      if (spell === undefined) {
        report(log, { reason: KindDataGapReason.UnresolvedReference, field: `spells.${rank}`, raw: uuid });
      }
      return spell === undefined ? [] : [{ rank: Number(rank), spell }];
    });
}

/** The deity's data, unparsed; undefined when its `system` is not shaped as a deity's. */
export function deityData(input: KindInput): object | undefined {
  const system = systemOf(FoundryDeitySystem, input);
  if (system === undefined) {
    return undefined;
  }
  const { sanctification } = system;
  return {
    category: system.category,
    ...setFields({ sanctification: sanctification ?? undefined }),
    domains: { primary: domainKeys(system.domains.primary), alternate: domainKeys(system.domains.alternate) },
    font: system.font,
    attributes: system.attribute,
    skills: (system.skill ?? []).map((skill) => `skill:${skill}`),
    weapons: system.weapons,
    spells: spellsOf(system.spells, input),
  };
}
