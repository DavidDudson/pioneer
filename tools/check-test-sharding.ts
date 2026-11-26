/**
 * Fails if a `project.json` target shards `bun test` by test name (`tools/test-sharding.ts`).
 */
import { Glob } from 'bun';

import { nameShards, PROJECT, shardProblems } from './test-sharding.ts';

const found: string[] = [];

for await (const file of new Glob('{apps,libs,tools}/**/project.json').scan({ onlyFiles: true })) {
  if (!file.includes('node_modules')) {
    const json: unknown = await Bun.file(file).json();

    found.push(...nameShards(file, PROJECT.parse(json)));
  }
}

const problems = shardProblems(found);

if (problems.length > 0) {
  throw new Error(`Tests sharded by name:\n- ${problems.join('\n- ')}`);
}
