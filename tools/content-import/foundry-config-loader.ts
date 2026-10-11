/**
 * Loads Foundry pf2e's config modules (`CONFIG_MODULES`) out of the pinned archive. They are TypeScript that builds
 * its tables with spreads and remeda, so they are run rather than parsed: written below the cache directory and
 * imported with Bun. This runs code from the archive, which is checked against the pin's SHA-256 first, and these
 * modules hold only constant tables. Their imports are types Bun drops, and remeda, which a virtual module stands in
 * for with the four functions they call; a module that needs more fails to load, naming the missing export.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { CONFIG_MODULES, foundryConfig } from '@pioneer/interop/foundry';
import type { ConfigModule, FoundryConfig } from '@pioneer/interop/foundry';

/** Foundry's build-time system id, read by the language table. */
const SYSTEM_ID = 'pf2e';

type Table = Readonly<Record<string, unknown>>;

function pick(table: Table, keys: readonly string[]): Table {
  return Object.fromEntries(keys.filter((key) => Object.hasOwn(table, key)).map((key) => [key, table[key]]));
}

function omit(table: Table, keys: readonly string[]): Table {
  const omitted = new Set(keys);
  return Object.fromEntries(Object.entries(table).filter(([key]) => !omitted.has(key)));
}

const REMEDA = {
  keys: (table: Table): string[] => Object.keys(table),
  values: (table: Table): unknown[] => Object.values(table),
  pick,
  omit,
};

let registered = false;

function registerShims(): void {
  if (registered) {
    return;
  }
  registered = true;
  Object.assign(globalThis, { SYSTEM_ID });
  Bun.plugin({
    name: 'foundry-config-remeda',
    setup(build): void {
      build.module('remeda', () => ({ loader: 'object', exports: REMEDA }));
    },
  });
}

/** The config modules' text, by archive path (top-level directory included), written below `directory`. */
async function writeModules(files: ReadonlyMap<string, string>, directory: string): Promise<void> {
  const byPath = new Map([...files].map(([file, text]) => [file.slice(file.indexOf('/') + 1), text]));
  await Promise.all(
    Object.values(CONFIG_MODULES).map(async (module) => {
      const text = byPath.get(module);
      if (text === undefined) {
        throw new Error(`The archive has no ${module}`);
      }
      await mkdir(path.dirname(path.join(directory, module)), { recursive: true });
      await Bun.write(path.join(directory, module), text);
    }),
  );
}

export async function loadFoundryConfig(files: ReadonlyMap<string, string>, directory: string): Promise<FoundryConfig> {
  await writeModules(files, directory);
  registerShims();
  const entries = await Promise.all(
    Object.entries(CONFIG_MODULES).map(async ([name, module]) => {
      const exports: unknown = await import(path.join(directory, module));
      return [name, exports] as const;
    }),
  );
  const modules: Partial<Record<ConfigModule, unknown>> = Object.fromEntries(entries);
  return foundryConfig({ traits: modules.traits, creature: modules.creature, damage: modules.damage });
}
