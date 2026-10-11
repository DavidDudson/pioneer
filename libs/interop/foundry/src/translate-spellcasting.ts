import { RuleElementKey } from '@pioneer/rules/sdk';

import { addRule, KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';

/**
 * The spellcasting entries and spellcasting rank raises of Player Core's class features and feats. Foundry has no rule
 * element for either: a spellcasting entry is an item the player adds by hand, and its rank is the actor's. The
 * importer adds them by entry slug (ADR-0037), as it names a class's subclass tag; a later book's casters are added
 * with its import, or by hand in the pack (ADR-0031).
 */

interface EntryFields {
  readonly slug: string;
  readonly tradition: string;
  readonly attribute: string;
  readonly preparation: string;
}

function entry(fields: EntryFields): object {
  return { key: RuleElementKey.SpellcastingEntry, ...fields };
}

function raise(tradition: string, rank: string, predicate?: readonly string[]): object {
  const selector = `spellcasting:${tradition}`;
  return { key: RuleElementKey.Proficiency, selector, rank, ...(predicate === undefined ? {} : { predicate }) };
}

/**
 * A class's entry, raised to expert, master and legendary by the Expert, Master and Legendary Spellcaster class
 * features, which every Player Core caster but the cleric shares and gets at 7th, 15th and 19th level.
 */
function classEntry(fields: EntryFields): readonly object[] {
  return [
    entry(fields),
    raise(fields.tradition, 'expert', ['feature:expert-spellcaster']),
    raise(fields.tradition, 'master', ['feature:master-spellcaster']),
    raise(fields.tradition, 'legendary', ['feature:legendary-spellcaster']),
  ];
}

/** A witch's entry: the patron's tradition, read with Intelligence and prepared. */
function patron(tradition: string): readonly object[] {
  return classEntry({ slug: 'witch', tradition, attribute: 'int', preparation: 'prepared' });
}

const DIVINE = 'divine';

/** The rule elements each entry gains, by its entry slug. */
const SPELLCASTING: ReadonlyMap<string, readonly object[]> = new Map([
  [
    'class-feature:bard-spellcasting',
    classEntry({ slug: 'bard', tradition: 'occult', attribute: 'cha', preparation: 'spontaneous' }),
  ],
  [
    'class-feature:druid-spellcasting',
    classEntry({ slug: 'druid', tradition: 'primal', attribute: 'wis', preparation: 'prepared' }),
  ],
  [
    'class-feature:wizard-spellcasting',
    classEntry({ slug: 'wizard', tradition: 'arcane', attribute: 'int', preparation: 'prepared' }),
  ],
  // A cleric's rank rises with its doctrine: a cloistered cleric's at 7th, 15th and 19th, a warpriest's at 11th and 19th.
  [
    'class-feature:cleric-spellcasting',
    [entry({ slug: 'cleric', tradition: DIVINE, attribute: 'wis', preparation: 'prepared' })],
  ],
  ['class-feature:third-doctrine-cloistered-cleric', [raise(DIVINE, 'expert')]],
  ['class-feature:fifth-doctrine-cloistered-cleric', [raise(DIVINE, 'master')]],
  ['class-feature:final-doctrine-cloistered-cleric', [raise(DIVINE, 'legendary')]],
  ['class-feature:fourth-doctrine-warpriest', [raise(DIVINE, 'expert')]],
  ['class-feature:final-doctrine-warpriest', [raise(DIVINE, 'master')]],
  // Witch Spellcasting names no tradition: the patron the witch picks does.
  ['class-feature:faiths-flamekeeper', patron(DIVINE)],
  ['class-feature:silence-in-snow', patron('primal')],
  ['class-feature:spinner-of-threads', patron('occult')],
  ['class-feature:starless-shadow', patron('occult')],
  ['class-feature:the-inscribed-one', patron('arcane')],
  ['class-feature:the-resentment', patron('occult')],
  ['class-feature:wilding-steward', patron('primal')],
  // A multiclass dedication casts like its class; the archetype's Expert and Master Spellcasting feats raise its rank.
  [
    'feat:bard-dedication',
    [entry({ slug: 'bard', tradition: 'occult', attribute: 'cha', preparation: 'spontaneous' })],
  ],
  ['feat:expert-bard-spellcasting', [raise('occult', 'expert')]],
  ['feat:master-bard-spellcasting', [raise('occult', 'master')]],
  ['feat:cleric-dedication', [entry({ slug: 'cleric', tradition: DIVINE, attribute: 'wis', preparation: 'prepared' })]],
  ['feat:expert-cleric-spellcasting', [raise(DIVINE, 'expert')]],
  ['feat:master-cleric-spellcasting', [raise(DIVINE, 'master')]],
  ['feat:druid-dedication', [entry({ slug: 'druid', tradition: 'primal', attribute: 'wis', preparation: 'prepared' })]],
  ['feat:expert-druid-spellcasting', [raise('primal', 'expert')]],
  ['feat:master-druid-spellcasting', [raise('primal', 'master')]],
  [
    'feat:wizard-dedication',
    [entry({ slug: 'wizard', tradition: 'arcane', attribute: 'int', preparation: 'prepared' })],
  ],
  ['feat:expert-wizard-spellcasting', [raise('arcane', 'expert')]],
  ['feat:master-wizard-spellcasting', [raise('arcane', 'master')]],
]);

/**
 * Casters whose tradition Foundry does not record: a witch dedication's is its patron's, which Foundry leaves to the
 * player. Reported, so the gap shows in the import's backlog.
 */
const UNKNOWN_TRADITION: ReadonlySet<string> = new Set([
  'feat:witch-dedication',
  'feat:expert-witch-spellcasting',
  'feat:master-witch-spellcasting',
]);

const FIELD = 'spellcasting';

/** Adds the spellcasting entry and rank raises the entry gains, if any, to its rules. */
export function spellcastingRules(input: KindInput): void {
  const { slug } = input.envelope;
  for (const element of SPELLCASTING.get(slug) ?? []) {
    addRule(input, FIELD, element);
  }
  if (UNKNOWN_TRADITION.has(slug)) {
    report(input.log, { reason: KindDataGapReason.UnmappedValue, field: FIELD, raw: slug });
  }
}
