import { describe, expect, test } from 'bun:test';

import { deploy, GHCR_IMAGE } from './deploy.ts';
import type { CommandOptions, CommandResult, DeployDeps, HealthPolicy, HttpResponse } from './deploy.ts';

const REPOSITORY = '123456789012.dkr.ecr.ap-southeast-2.amazonaws.com/pioneer-api';
const DATABASE_URL = 'postgres://pioneer:secret@ep-1.neon.tech/pioneer';
const ORIGIN = 'https://pioneer.example.com';
const FAST: HealthPolicy = { attempts: 3, intervalMs: 1 };

interface Call {
  readonly command: string;
  readonly options: CommandOptions | undefined;
}

interface Fake {
  readonly deps: DeployDeps;
  readonly calls: Call[];
  readonly masked: string[];
  readonly sleeps: number[];
}

interface FakeSetup {
  /** Tags already in ECR. */
  readonly inEcr?: readonly string[];
  /** Health responses in order; the last repeats. */
  readonly health?: readonly (HttpResponse | Error)[];
  /** Command prefixes that exit non-zero. */
  readonly failing?: readonly string[];
  /** What the function's environment holds; both variables by default. */
  readonly settings?: Readonly<Record<string, string>>;
}

const ok = (stdout = ''): CommandResult => ({ code: 0, stdout: `${stdout}\n`, stderr: '' });
const healthy: HttpResponse = { status: 200, body: '{"status":"ok"}' };

function fake({
  inEcr = [],
  health = [healthy],
  failing = [],
  settings = { databaseUrl: DATABASE_URL, origin: ORIGIN },
}: FakeSetup = {}): Fake {
  const calls: Call[] = [];
  const masked: string[] = [];
  const sleeps: number[] = [];
  let healthIndex = 0;

  function respond(command: string): CommandResult {
    if (failing.some((prefix) => command.startsWith(prefix))) {
      return { code: 1, stdout: '', stderr: 'boom' };
    }
    if (command.startsWith('aws ecr describe-repositories')) {
      return ok(REPOSITORY);
    }
    if (command.startsWith('aws lambda get-function ')) {
      return ok(`${REPOSITORY}:sha-0000000`);
    }
    if (command.startsWith('aws lambda get-function-configuration')) {
      return ok(JSON.stringify(settings));
    }
    if (command.startsWith('aws ecr describe-images')) {
      const present = inEcr.some((tag) => command.endsWith(`imageTag=${tag}`));
      return present
        ? ok('{}')
        : { code: 254, stdout: '', stderr: 'An error occurred (ImageNotFoundException) when calling DescribeImages' };
    }
    if (command.startsWith('aws ecr get-login-password')) {
      return ok('ecr-password');
    }
    return ok();
  }

  const deps: DeployDeps = {
    run: async (command: readonly string[], options?: CommandOptions): Promise<CommandResult> => {
      const line = command.join(' ');
      calls.push({ command: line, options });
      return respond(line);
    },
    get: async (url: string): Promise<HttpResponse> => {
      expect(url).toBe(`${ORIGIN}/api/health`);
      const next = health[Math.min(healthIndex, health.length - 1)] ?? healthy;
      healthIndex += 1;
      if (next instanceof Error) {
        throw next;
      }
      return next;
    },
    log: (): void => {
      // Quiet in tests.
    },
    mask: (secret: string): void => {
      masked.push(secret);
    },
    sleep: async (ms: number): Promise<void> => {
      sleeps.push(ms);
    },
  };
  return { deps, calls, masked, sleeps };
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

const commandNames = (calls: readonly Call[]): string[] =>
  calls.map(({ command }) => command.split(' ').slice(0, 3).join(' '));

describe('deploy', () => {
  test('copies a new image, migrates, then points the function at it and checks health', async () => {
    const { deps, calls } = fake();
    const result = await deploy('sha-1a2b3c4', deps, FAST);

    expect(result).toStrictEqual({
      previousImage: `${REPOSITORY}:sha-0000000`,
      image: `${REPOSITORY}:sha-1a2b3c4`,
      copied: true,
    });
    expect(commandNames(calls)).toStrictEqual([
      'aws ecr describe-repositories',
      'aws lambda get-function',
      'aws lambda get-function-configuration',
      'aws ecr describe-images',
      'aws ecr get-login-password',
      'skopeo login --username',
      'skopeo copy --override-os',
      'docker run --rm',
      'docker run --rm',
      'aws lambda update-function-code',
      'aws lambda wait',
    ]);
    const copy = calls.find(({ command }) => command.startsWith('skopeo copy'));
    expect(copy?.command).toBe(
      `skopeo copy --override-os linux --override-arch arm64 docker://${GHCR_IMAGE}:sha-1a2b3c4 docker://${REPOSITORY}:sha-1a2b3c4`,
    );
    const update = calls.find(({ command }) => command.startsWith('aws lambda update-function-code'));
    expect(update?.command).toContain(`--image-uri ${REPOSITORY}:sha-1a2b3c4`);
  });

  test('migrates, then seeds content, with the new image before the function changes', async () => {
    const { deps, calls } = fake();
    await deploy('sha-1a2b3c4', deps, FAST);

    const names = commandNames(calls);
    expect(names.lastIndexOf('docker run --rm')).toBeLessThan(names.indexOf('aws lambda update-function-code'));
    const runs = calls.filter(({ command }) => command.startsWith('docker run'));
    expect(runs.map(({ command }) => command)).toStrictEqual([
      `docker run --rm --env DATABASE_URL ${GHCR_IMAGE}:sha-1a2b3c4 migrate`,
      `docker run --rm --env DATABASE_URL ${GHCR_IMAGE}:sha-1a2b3c4 content-seed`,
    ]);
    for (const run of runs) {
      expect(run.options?.env).toStrictEqual({ DATABASE_URL });
    }
  });

  test('keeps secrets off command lines and masks them', async () => {
    const { deps, calls, masked } = fake();
    await deploy('sha-1a2b3c4', deps, FAST);

    for (const { command } of calls) {
      expect(command).not.toContain('secret');
      expect(command).not.toContain('ecr-password');
    }
    expect(masked).toStrictEqual([DATABASE_URL, 'ecr-password']);
    const login = calls.find(({ command }) => command.startsWith('skopeo login'));
    expect(login?.options?.stdin).toBe('ecr-password');
    expect(login?.command).toEndWith(' 123456789012.dkr.ecr.ap-southeast-2.amazonaws.com');
  });

  test('rolls back to an image still in ECR without copying it', async () => {
    const { deps, calls } = fake({ inEcr: ['sha-0dd0dd0'] });
    const result = await deploy('sha-0dd0dd0', deps, FAST);

    expect(result.copied).toBe(false);
    expect(commandNames(calls)).not.toContain('skopeo copy --override-os');
    // An earlier image's migrations are all applied already; running them is a no-op, not skipped.
    expect(commandNames(calls)).toContain('docker run --rm');
    const update = calls.find(({ command }) => command.startsWith('aws lambda update-function-code'));
    expect(update?.command).toContain(`--image-uri ${REPOSITORY}:sha-0dd0dd0`);
  });

  test('retries health until it answers ok', async () => {
    const { deps, sleeps } = fake({ health: [new Error('connect refused'), { status: 502, body: '' }, healthy] });
    await deploy('sha-1a2b3c4', deps, FAST);
    expect(sleeps).toStrictEqual([1, 1]);
  });

  test('fails when health never answers ok', async () => {
    const { deps, sleeps } = fake({ health: [{ status: 503, body: 'Service Unavailable' }] });
    const message = await failureOf(deploy('sha-1a2b3c4', deps, FAST));
    expect(message).toStartWith(`${ORIGIN}/api/health not healthy after 3 attempts: HTTP 503`);
    expect(sleeps).toStrictEqual([1, 1]);
  });

  test('fails when a 200 is not the health route, such as the web app’s index.html', async () => {
    const { deps } = fake({ health: [{ status: 200, body: '<!doctype html>' }] });
    const message = await failureOf(deploy('sha-1a2b3c4', deps, FAST));
    expect(message).toEndWith(': HTTP 200 without "ok" in the body');
  });

  test('stops before ECR, migrating or the function when the function lacks its settings', async () => {
    const { deps, calls, masked } = fake({ settings: {} });
    const message = await failureOf(deploy('sha-1a2b3c4', deps, FAST));
    expect(message).toStartWith('pioneer-api has no DATABASE_URL or PUBLIC_ORIGIN');
    expect(commandNames(calls)).toStrictEqual([
      'aws ecr describe-repositories',
      'aws lambda get-function',
      'aws lambda get-function-configuration',
    ]);
    expect(masked).toStrictEqual([]);
  });

  test('stops before touching the function when migrating fails', async () => {
    const { deps, calls } = fake({ failing: ['docker run'] });
    const message = await failureOf(deploy('sha-1a2b3c4', deps, FAST));
    expect(message).toStartWith('docker run --rm failed (exit 1): boom');
    expect(commandNames(calls)).not.toContain('aws lambda update-function-code');
  });

  test('stops when ECR cannot be read, rather than copying blind', async () => {
    const { deps, calls } = fake({ failing: ['aws ecr describe-images'] });
    const message = await failureOf(deploy('sha-1a2b3c4', deps, FAST));
    expect(message).toStartWith('aws ecr describe-images failed (exit 1): boom');
    expect(commandNames(calls)).not.toContain('skopeo copy --override-os');
  });

  test.each(['main', 'latest', 'sha-XYZ', 'sha-123', '1a2b3c4'])('refuses the tag %p', async (tag) => {
    const { deps, calls } = fake();
    const message = await failureOf(deploy(tag, deps, FAST));
    expect(message).toStartWith('Deploy a published sha- tag');
    expect(calls).toStrictEqual([]);
  });
});
