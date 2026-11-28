/**
 * Fails if a `project.json` target shards `bun test` by test name (`tools/test-sharding.ts`).
 */
import { Glob } from 'bun';

import { nameShards, PROJECT, shardProblems } from './test-sharding.ts';

const scanned = await Array.fromAsync(new Glob('{apps,libs,tools}/**/project.json').scan({ onlyFiles: true }));
const files = scanned.filter((file) => !file.includes('node_modules'));

const perFile = await Promise.all(
  files.map(async (file): Promise<ReadonlyArray<string>> => {
    const json: unknown = await Bun.file(file).json();
    const project = PROJECT.safeParse(json);

    if (!project.success) {
      throw new Error(`${file}: not a readable project.json`, { cause: project.error });
    }

    return nameShards(file, project.data);
  }),
);

const found = perFile.flat();

const problems = shardProblems(found);

if (problems.length > 0) {
  throw new Error(`Tests sharded by name:\n- ${problems.join('\n- ')}`);
}
