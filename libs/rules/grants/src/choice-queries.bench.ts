import { expect } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { benchmark } from '@pioneer/shared/bench';

import type { GrantEntry } from './grant-entry';
import { walkGrants } from './grant-walk';
import type { WalkInputs } from './grant-walk';
import type { OfferedOption } from './offers';
import { entry, feat, lookupOf, picked, picksOf } from './testing/builders';

const ENTRIES = 1000;
const LEVELS = 20;
const CLASSES = ['fighter', 'rogue', 'wizard', 'cleric', 'ranger'] as const;
/** The issue's budget for one query over a thousand entries. */
const BUDGET_MS = 2;

/** Feats spread over the classes and levels, each with a class trait, a level and two more traits. */
function feats(): GrantEntry[] {
  return Array.from({ length: ENTRIES }, (_value, index) =>
    feat(`feat-${index}`, [
      `trait:${CLASSES[index % CLASSES.length] ?? 'fighter'}`,
      `level:${(index % LEVELS) + 1}`,
      'trait:general',
      `trait:tag-${index % 7}`,
    ]),
  );
}

/** A 5th-level fighter with some facts, asking for a fighter feat of their level or lower. */
function inputs(): WalkInputs {
  const fighter = entry('fighter', [
    {
      key: 'ChoiceSet',
      flag: 'class-feat',
      choices: { kind: 'feat', filter: ['item:trait:fighter', { lte: ['item:level', 'self:level'] }] },
    },
  ]);
  const options = [
    'self:level:5',
    'class:fighter',
    ...Array.from({ length: 40 }, (_value, index) => `feat:f-${index}`),
  ];
  return {
    roots: [picked('fighter')],
    lookup: lookupOf([fighter, ...feats()]),
    facts: new PredicateFacts(
      options.map((option) => RollOption.parse(option)),
      CORE_NAMESPACES,
    ),
    picks: picksOf(),
  };
}

/** What the walk's open slot offers. */
function offerOf(given: WalkInputs): readonly OfferedOption[] {
  return walkGrants(given).open[0]?.options ?? [];
}

/*
 * One walk and the offer a builder reads: offers are worked out only when read, so the fixpoint benches time
 * resolution and this one times the query. Fresh entries each run, as a caller building content per request has them;
 * only resolution is timed.
 */
expect(offerOf(inputs()).length).toBeGreaterThan(0);
benchmark({
  name: `grants: a query over ${ENTRIES} entries`,
  budgetMs: BUDGET_MS,
  prepare: inputs,
  run: offerOf,
});
