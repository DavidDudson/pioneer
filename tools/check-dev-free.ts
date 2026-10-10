/**
 * Fails if a production build contains dev-only code (`tools/dev-markers.ts`): the seeded dev users and their
 * one-click sign-in exist for local development only. Pass the build output directories or files to scan.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { findMarkers } from './dev-markers.ts';

function filesUnder(target: string): string[] {
  const isDirectory = statSync(target).isDirectory();
  if (!isDirectory) {
    return [target];
  }
  return readdirSync(target, { recursive: true, encoding: 'utf8' })
    .map((entry) => path.join(target, entry))
    .filter((file) => statSync(file).isFile());
}

const targets = Bun.argv.slice(2);
if (targets.length === 0) {
  throw new Error('Usage: bun tools/check-dev-free.ts <build output>...');
}
const files = targets.flatMap((target) => filesUnder(target));
if (files.length === 0) {
  throw new Error(`No files under ${targets.join(', ')}; build first`);
}
const problems = files.flatMap((file) =>
  findMarkers(readFileSync(file)).map((marker) => `${file}: contains dev-only "${marker}"`),
);
if (problems.length > 0) {
  throw new Error(`Dev-only code in a production build:\n- ${problems.join('\n- ')}`);
}
