import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CONFIG_MODULES, TraitList } from '@pioneer/interop/foundry';

import { loadFoundryConfig } from './foundry-config-loader';

const ROOT = 'pf2e-pf2e-8.6.0';

const EMPTY_LISTS = Object.values(TraitList)
  .filter((list) => list !== TraitList.Action && list !== TraitList.Feat)
  .map((list) => `const ${list} = {};`)
  .join('\n');

// Shaped as Foundry writes them: type-only imports Bun drops, remeda, and the build-time SYSTEM_ID.
const TRAITS = `import { ClassTrait } from "@item/class/types.ts";
import * as R from "remeda";
const baseFeat = { general: "PF2E.TraitGeneral", skill: "PF2E.TraitSkill" };
const featTraits = R.omit(baseFeat, ["skill"]);
const actionTraits = { ...R.pick(baseFeat, ["skill"]), move: "PF2E.TraitMove" };
${EMPTY_LISTS}
export { ${Object.values(TraitList).join(', ')} };
`;

const CREATURE = `import * as R from "remeda";
import type { Language } from "./types.ts";
const LANGUAGES_BY_RARITY = {
  pf2e: { common: ["dwarven"], uncommon: [], rare: [], secret: [] },
  sf2e: { common: ["pact-common"], uncommon: [], rare: [], secret: [] },
};
const DEFAULT = SYSTEM_ID === "pf2e" ? "taldane" : "pact-common";
const SENSE_TYPES = new Set(["darkvision", "scent"]);
const SENSES_WITH_MANDATORY_ACUITIES = { darkvision: "precise" };
const SENSES_WITH_UNLIMITED_RANGE = ["darkvision"];
const LANGUAGES: Language[] = ["common", ...R.values(LANGUAGES_BY_RARITY[SYSTEM_ID]).flat()];
export { LANGUAGES, LANGUAGES_BY_RARITY, SENSE_TYPES, SENSES_WITH_MANDATORY_ACUITIES, SENSES_WITH_UNLIMITED_RANGE, DEFAULT };
`;

const DAMAGE = `import { DamageType } from "./types.ts";
const DAMAGE_TYPES = new Set(["fire", ...R_KEYS()]);
function R_KEYS(): DamageType[] { return ["cold"]; }
export { DAMAGE_TYPES };
`;

function archive(overrides: Partial<Record<keyof typeof CONFIG_MODULES, string>> = {}): ReadonlyMap<string, string> {
  const texts = { traits: TRAITS, creature: CREATURE, damage: DAMAGE, ...overrides };
  return new Map(
    Object.entries(CONFIG_MODULES).map(([name, module]) => [`${ROOT}/${module}`, texts[name as keyof typeof texts]]),
  );
}

async function withDirectory<Result>(run: (directory: string) => Promise<Result>): Promise<Result> {
  const directory = await mkdtemp(path.join(tmpdir(), 'foundry-config-'));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** The message a promise rejects with; fails the test when it resolves. */
async function failureOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('expected a failure');
}

describe('loadFoundryConfig', () => {
  test("runs Foundry's config modules with remeda and SYSTEM_ID provided", async () => {
    const config = await withDirectory(async (directory) => loadFoundryConfig(archive(), directory));

    expect(config.traitLists.get(TraitList.Feat)).toEqual(new Map([['general', 'PF2E.TraitGeneral']]));
    expect(config.traitLists.get(TraitList.Action)).toEqual(
      new Map([
        ['skill', 'PF2E.TraitSkill'],
        ['move', 'PF2E.TraitMove'],
      ]),
    );
    expect([...config.languages.keys()]).toEqual(['common', 'dwarven']);
    expect(config.senses.get('darkvision')).toEqual({ acuity: 'precise', unlimitedRange: true });
    expect(config.damageTypes).toEqual(['fire', 'cold']);
  });

  test('a module missing from the archive stops the import', async () => {
    const files = new Map([...archive()].filter(([file]) => !file.endsWith(CONFIG_MODULES.damage)));
    const message = await failureOf(withDirectory(async (directory) => loadFoundryConfig(files, directory)));

    expect(message).toContain(CONFIG_MODULES.damage);
  });
});
