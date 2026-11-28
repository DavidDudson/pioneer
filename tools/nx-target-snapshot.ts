/**
 * Writes one JSON file per Nx project (its tags and targets, normalised) into a directory, so `diff -r before after`
 * proves a change to how targets are declared left the target graph as it was.
 *
 *   bun tools/nx-target-snapshot.ts <out dir>
 *
 * The graph comes from a single `nx graph --file` run. Run it before and after the change, in the same checkout.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { parseGraphNodes, snapshotProject } from './nx-target-snapshot-format.ts';

const [outDirectory] = Bun.argv.slice(2);

if (outDirectory === undefined) {
  throw new Error('Usage: bun tools/nx-target-snapshot.ts <out dir>');
}

const scratch = mkdtempSync(path.join(tmpdir(), 'nx-snapshot-'));
const graphFile = path.join(scratch, 'graph.json');

try {
  const run = Bun.spawnSync([process.execPath, 'x', 'nx', 'graph', `--file=${graphFile}`], {
    stdout: 'inherit',
    stderr: 'inherit',
  });

  if (run.exitCode !== 0) {
    throw new Error(`nx graph failed with exit code ${run.exitCode}`);
  }

  const nodes = parseGraphNodes(readFileSync(graphFile, 'utf8'));

  mkdirSync(outDirectory, { recursive: true });

  for (const [name, project] of Object.entries(nodes)) {
    writeFileSync(path.join(outDirectory, `${name}.json`), snapshotProject(project));
  }

  process.stdout.write(`Wrote ${Object.keys(nodes).length} project snapshots to ${outDirectory}\n`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
