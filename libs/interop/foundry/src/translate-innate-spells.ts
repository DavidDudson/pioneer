import { PackId, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { spellId } from './focus-plan';
import source from './innate-spells.json';

/**
 * The innate entries and innate spells of Player Core's ancestry and archetype feats that teach them, as
 * `SpellcastingEntry` elements with preparation `innate` and `InnateSpells` elements by the entry slug they go on
 * (ADR-0067). Foundry grants no innate spell by rule element: the player drags each into an innate entry by hand, and
 * Fey Influence's `ChoiceSet` picks an animal whose spell nothing grants. The importer adds them from the feats' text,
 * kept in `innate-spells.json` at `pf2e-8.6.0`; a later book's innate feats are added with its import.
 *
 * A grant holds while its `when` does and names its spells with the rank each is cast at, or one spell with the rank
 * each range of levels gives it (`levels`: from which level, at which rank), as a spell heightened with the level is.
 */

const CANTRIP = 'cantrip';
/** Where the spells of the feats are printed, whichever book the feat is in. */
const PRINTED_IN = PackId.parse('player-core');
const SELF_LEVEL = 'self:level';

const Rank = z.union([z.literal(CANTRIP), z.number()]);
const Predicate = z.array(z.unknown());
const Spell = z.tuple([z.string(), Rank]);
const LevelRank = z.tuple([z.number(), z.number()]);
const Option = z.tuple([z.string(), z.string()]);
const Choice = z.object({ flag: z.string(), prompt: z.string(), options: z.array(Option) });

const Grant = z.object({
  when: Predicate.optional(),
  spells: z.array(Spell).optional(),
  spell: z.string().optional(),
  levels: z.array(LevelRank).optional(),
});
type Grant = z.infer<typeof Grant>;

const Feat = z.object({
  entry: z.object({
    slug: z.string(),
    tradition: z.string(),
    attribute: z.string(),
    when: Predicate.optional(),
  }),
  choice: Choice.optional(),
  grants: z.array(Grant),
});
type Feat = z.infer<typeof Feat>;

const Source = z.record(z.string(), Feat);
const FEATS: ReadonlyMap<string, Feat> = new Map(Object.entries(Source.parse(source)));

function withPredicate(predicate: readonly unknown[] | undefined): object {
  return predicate === undefined ? {} : { predicate };
}

function entryRule({ entry }: Feat): object {
  const { slug, tradition, attribute, when } = entry;
  return {
    key: RuleElementKey.SpellcastingEntry,
    slug,
    tradition,
    attribute,
    preparation: 'innate',
    ...withPredicate(when),
  };
}

function choiceRule({ choice }: Feat): object[] {
  return choice === undefined
    ? []
    : [
        {
          key: RuleElementKey.ChoiceSet,
          flag: choice.flag,
          rollOption: choice.flag,
          prompt: choice.prompt,
          choices: choice.options.map(([value, label]) => ({ value, label })),
        },
      ];
}

/** The elements that give `spells` while `when` holds. */
function granting(entry: string, spells: readonly z.infer<typeof Spell>[], when: readonly unknown[]): object {
  return {
    key: RuleElementKey.InnateSpells,
    entry,
    spells: spells.map(([spell, rank]) => ({ rank, spell: spellId(PRINTED_IN, spell) })),
    ...withPredicate(when.length === 0 ? undefined : when),
  };
}

/** One element per range of levels: from its level to the level before the next range's, the last holding on. */
function byLevel(entry: string, { spell, levels, when = [] }: Grant): object[] {
  return (levels ?? []).map(([from, rank], index) => {
    const next = levels?.[index + 1];
    const atLeast = { gte: [SELF_LEVEL, from] };
    const range = next === undefined ? atLeast : { and: [atLeast, { lt: [SELF_LEVEL, next[0]] }] };
    return granting(entry, [[spell ?? '', rank]], [...when, range]);
  });
}

function grantRules(entry: string, grant: Grant): object[] {
  return grant.levels === undefined ? [granting(entry, grant.spells ?? [], grant.when ?? [])] : byLevel(entry, grant);
}

/** The innate entry, choices and `InnateSpells` elements the entry with `slug` gains, if any. */
export function innateSpellRules(slug: string): readonly object[] {
  const feat = FEATS.get(slug);
  return feat === undefined
    ? []
    : [entryRule(feat), ...choiceRule(feat), ...feat.grants.flatMap((grant) => grantRules(feat.entry.slug, grant))];
}
