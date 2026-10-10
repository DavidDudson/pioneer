/**
 * Deploys a published image to production: `bun tools/deploy-production.ts sha-1a2b3c4`. Rolling back is the same
 * command with an earlier tag. Needs AWS credentials for the deploy role (or admin), `aws`, `skopeo` and `docker`,
 * and read access to ghcr.io. CI runs it from .github/workflows/deploy.yml. See docs/production.md.
 */
import { deploy } from './deploy.ts';
import type { CommandOptions, CommandResult, HttpResponse } from './deploy.ts';

/** One health request; the deploy retries, so a hung one should not eat the budget. */
const REQUEST_TIMEOUT_MS = 10_000;
const inActions = Bun.env['GITHUB_ACTIONS'] === 'true';

async function run(command: readonly string[], options: CommandOptions = {}): Promise<CommandResult> {
  const child = Bun.spawn([...command], {
    stdin: options.stdin === undefined ? 'ignore' : new TextEncoder().encode(options.stdin),
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, ...options.env },
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { code, stdout, stderr };
}

async function get(url: string): Promise<HttpResponse> {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const body = await response.text();
  return { status: response.status, body };
}

const [tag] = Bun.argv.slice(2);
if (tag === undefined) {
  throw new Error('Usage: bun tools/deploy-production.ts sha-<short commit>');
}
const result = await deploy(tag, {
  run,
  get,
  log: (line: string): void => {
    console.info(line);
  },
  mask: (secret: string): void => {
    if (inActions) {
      console.info(`::add-mask::${secret}`);
    }
  },
  sleep: async (ms: number): Promise<void> => {
    await Bun.sleep(ms);
  },
});
const previousTag = result.previousImage.split(':').at(-1);
console.info(`Deployed ${result.image}. Roll back with: bun tools/deploy-production.ts ${previousTag}`);
