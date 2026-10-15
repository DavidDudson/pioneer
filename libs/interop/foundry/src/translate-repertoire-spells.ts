import { EntrySlug, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import sourceTable from './repertoire-spells.json';

/**
 * The spontaneous entries and repertoire spells of Player Core 2's sorcerer bloodlines and oracle mysteries, as
 * `SpellcastingEntry` and `RepertoireSpells` elements (ADR-0062). Foundry keeps neither: a bloodline's sorcerous gifts
 * and a mystery's granted spells are text, and the sorcerer's tradition is a bloodline's roll option or, for a draconic
 * exemplar, an actor flag. The importer adds them by feature slug from Player Core 2's text at `pf2e-8.6.0`, kept in
 * `repertoire-spells.json`; a later book's bloodlines and mysteries are added with its import. Spells are named by slug
 * and resolve to whichever official pack holds them, as a bloodline draws on Player Core's spells too.
 */

const SORCERER = 'sorcerer';
const FIELD = 'spellcasting';
const CHA = 'cha';
const PRIMAL = 'primal';

/** The name the deity Divine Access picks is stored under, which the oracle's mysteries ask and the feature reads. */
export const DIVINE_ACCESS_DEITY = 'divine-access-deity';
const DIVINE_ACCESS_LEVEL = 11;

/** A rank (a cantrip, or 1 to 9) and the spell by slug. */
const Gift = z.tuple([z.union([z.literal('cantrip'), z.number()]), z.string()]);
type Gift = z.infer<typeof Gift>;

/** One option of a choice: its value, its label, the tradition it names, if any, and the gifts it adds. */
const Option = z.object({
  value: z.string(),
  label: z.string(),
  tradition: z.string().optional(),
  gifts: z.array(Gift),
});

/** A choice made on the feature itself: the roll option its pick sets, its prompt, and its options. */
const Pick = z.object({ flag: z.string(), prompt: z.string(), options: z.array(Option) });
type Pick = z.infer<typeof Pick>;

/**
 * One bloodline or mystery: the entry it gives gifts to, its tradition when fixed (a sorcerer's bloodline names it; an
 * oracle's entry is the class's own), the gifts everyone with it gets, and any choice that adds more.
 */
const Source = z.object({
  entry: z.string(),
  tradition: z.string().optional(),
  gifts: z.array(Gift),
  pick: Pick.optional(),
  /** The domains a mystery relates to, which Divine Access offers the deities of; an oracle's mystery only. */
  domains: z.array(z.string()).optional(),
});
type Source = z.infer<typeof Source>;

const SOURCE_TABLE = z.record(z.string(), Source).parse(sourceTable);
const SOURCES: ReadonlyMap<string, Source> = new Map(Object.entries(SOURCE_TABLE));

/** A gift as the element names it: its rank, and its spell by id. */
interface Named {
  readonly rank: string | number;
  readonly spell: string;
}

/** Names each gift's spell by id; one whose spell doesn't resolve is reported and left out. */
type Resolve = (gifts: readonly Gift[]) => readonly Named[];

/** The sorcerer's entry in `tradition`, which the bloodline (or its draconic exemplar) names, holding while `predicate` does. */
function sorcererEntry(tradition: string, predicate?: readonly unknown[]): object {
  return {
    key: RuleElementKey.SpellcastingEntry,
    slug: SORCERER,
    tradition,
    attribute: CHA,
    preparation: 'spontaneous',
    ...(predicate === undefined ? {} : { predicate }),
  };
}

/** A `ChoiceSet` under the pick's flag, whose answer becomes the roll option `<flag>:<value>`. */
function choiceSet({ flag, prompt, options }: Pick): object {
  return {
    key: RuleElementKey.ChoiceSet,
    flag,
    rollOption: flag,
    prompt,
    choices: options.map(({ value, label }) => ({ value, label })),
  };
}

/** The sorcerer's entries a choice names: one per option, in its tradition, holding while the option is picked. */
function pickedEntries({ flag, options }: Pick): readonly object[] {
  return options.map(({ value, tradition }) => sorcererEntry(tradition ?? PRIMAL, [`${flag}:${value}`]));
}

/** A `RepertoireSpells` element for `spells`, if any resolved, holding while `predicate` does. */
function repertoire(entry: string, spells: readonly Named[], predicate?: readonly unknown[]): readonly object[] {
  return spells.length === 0
    ? []
    : [{ key: RuleElementKey.RepertoireSpells, entry, spells, ...(predicate === undefined ? {} : { predicate }) }];
}

/**
 * The deity Divine Access picks (ADR-0063): a `ChoiceSet` offering the deities that grant one of the mystery's domains,
 * primary or alternate, from the level the feature arrives at.
 */
function divineAccessDeity(domains: readonly string[]): object {
  return {
    key: RuleElementKey.ChoiceSet,
    flag: DIVINE_ACCESS_DEITY,
    choices: {
      kind: 'deity',
      filter: [{ or: domains.flatMap((domain) => [`item:domain:${domain}`, `item:alternate-domain:${domain}`]) }],
    },
    predicate: [{ gte: ['self:level', DIVINE_ACCESS_LEVEL] }],
  };
}

/** The rule elements one bloodline or mystery gains, its gifts named by id. */
function elements({ entry, tradition, gifts, pick, domains }: Source, resolve: Resolve): readonly object[] {
  const fixed = entry === SORCERER && tradition !== undefined ? [sorcererEntry(tradition)] : [];
  const picked = entry === SORCERER && tradition === undefined && pick !== undefined ? pickedEntries(pick) : [];
  const more = (pick?.options ?? []).flatMap((option) =>
    repertoire(entry, resolve(option.gifts), [`${pick?.flag}:${option.value}`]),
  );
  return [
    ...fixed,
    ...(pick === undefined ? [] : [choiceSet(pick)]),
    ...picked,
    ...repertoire(entry, resolve(gifts)),
    ...more,
    ...(domains === undefined ? [] : [divineAccessDeity(domains)]),
  ];
}

/** The spontaneous entry and `RepertoireSpells` elements the bloodline or mystery of `input` gains, if any. */
export function repertoireSpellRules(input: KindInput): readonly object[] {
  const source = SOURCES.get(input.envelope.slug);
  if (source === undefined) {
    return [];
  }
  const resolve: Resolve = (gifts) =>
    gifts.flatMap(([rank, spell]) => {
      const slug = EntrySlug.safeParse(`spell:${spell}`);
      const spellId = slug.success ? input.references.bySlug.get(slug.data) : undefined;
      if (spellId === undefined) {
        report(input.log, { reason: KindDataGapReason.UnresolvedReference, field: FIELD, raw: `spell:${spell}` });
        return [];
      }
      return [{ rank, spell: spellId }];
    });
  return elements(source, resolve);
}
