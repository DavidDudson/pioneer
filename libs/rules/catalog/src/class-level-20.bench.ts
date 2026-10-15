import { expect } from "bun:test";

import { grantLookup, resolveGrants } from "@pioneer/rules/grants";
import type {
  ChoicePicks,
  GrantEntry,
  GrantInputs,
  GrantResolution,
} from "@pioneer/rules/grants";
import {
  ContentKind,
  ContentRegistry,
  Level,
  SlotKey,
} from "@pioneer/rules/sdk";
import type { ChoiceValue } from "@pioneer/rules/sdk";
import { benchmark } from "@pioneer/shared/bench";

import { contentCatalog } from "./index";

const LEVEL_MAX = 20;
/** The 10 ms budget for a whole derivation (rules-engine.md) leaves grant resolution a third of it. */
const BUDGET_MS = 3;
/** Most rounds of answering the slots a pick opens; real classes settle in a few. */
const PICK_ROUNDS_MAX = 8;

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const lookup = grantLookup(registry);
const namespaces = registry.rollOptionNamespaces();
const classes = lookup.ofKind(ContentKind.Class);

function inputsOf(root: GrantEntry, picks: ChoicePicks): GrantInputs {
  return {
    roots: [
      { entry: root.id, hop: { kind: "choice", slot: SlotKey.parse("class") } },
    ],
    lookup,
    level: Level.parse(LEVEL_MAX),
    situation: [],
    picks,
    toggles: new Map(),
    rootSlots: [],
    namespaces,
  };
}

/**
 * Picks for every slot of `root` at 20th level, found as a builder finds them: answer each open slot with its first
 * offer, resolve again for the slots that opens, until nothing more can be answered.
 */
function allPicked(root: GrantEntry): ChoicePicks {
  let picks: ChoicePicks = new Map();
  for (let round = 0; round < PICK_ROUNDS_MAX; round += 1) {
    const { open } = resolveGrants(inputsOf(root, picks));
    const answers = open.flatMap(({ key, options }) =>
      options[0] === undefined ? [] : [[key, options[0].value]],
    );
    if (answers.length === 0) {
      return picks;
    }
    picks = new Map([
      ...picks,
      ...answers.map(([key, value]): [SlotKey, ChoiceValue] => [key, value]),
    ]);
  }
  return picks;
}

function resolve(inputs: GrantInputs): GrantResolution {
  return resolveGrants(inputs);
}

expect(classes.length).toBeGreaterThan(0);
for (const root of classes) {
  const picks = allPicked(root);
  const inputs = inputsOf(root, picks);
  const result = resolveGrants(inputs);
  expect(result.errors).toEqual([]);
  expect(result.answered.length).toBeGreaterThan(0);
  expect(result.items.length).toBeGreaterThan(0);
  benchmark({
    name: `grants: level ${LEVEL_MAX} ${root.name} with every slot it offers picked`,
    budgetMs: BUDGET_MS,
    prepare: () => inputs,
    run: resolve,
  });
}
