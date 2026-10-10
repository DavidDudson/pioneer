/**
 * One production deploy (docs/production.md): copy a published `sha-` image from GHCR to ECR, migrate Neon with it,
 * point the Lambda function at it, then check `/api/health` through the public origin. A rollback is the same
 * deploy with an earlier tag: its image is usually still in ECR, and its migrations are all applied already, so
 * migrating is a no-op (migrations are forward-only; the earlier code must cope with the newer schema).
 */

export const GHCR_IMAGE = 'ghcr.io/daviddudson/pioneer';
export const FUNCTION_NAME = 'pioneer-api';
const TAG = /^sha-[0-9a-f]{7,40}$/u;
const HTTP_OK = 200;
/** Words of a failed command quoted in its error: enough to name it, short of any arguments. */
const COMMAND_WORDS = 3;

export interface CommandResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface CommandOptions {
  /** Written to the command's stdin. */
  readonly stdin?: string;
  /** Added to the inherited environment; keeps secrets off the command line. */
  readonly env?: Readonly<Record<string, string>>;
}

export interface HttpResponse {
  readonly status: number;
  readonly body: string;
}

/** What a deploy reads from the function's environment. */
interface FunctionSettings {
  readonly databaseUrl: string;
  readonly origin: string;
}

export interface DeployDeps {
  /** Runs a command to completion and captures its output; never throws on a non-zero exit. */
  readonly run: (command: readonly string[], options?: CommandOptions) => Promise<CommandResult>;
  /** GETs a URL and returns its status and body. */
  readonly get: (url: string) => Promise<HttpResponse>;
  readonly log: (line: string) => void;
  /** Hides a value from CI logs (GitHub's `::add-mask::`). */
  readonly mask: (secret: string) => void;
  readonly sleep: (ms: number) => Promise<void>;
}

export interface HealthPolicy {
  readonly attempts: number;
  readonly intervalMs: number;
}

/**
 * A cold start (Lambda pulls the image, Neon wakes) takes a few seconds. About a minute while requests fail fast;
 * requests that hang until their timeout stretch it to several minutes.
 */
export const DEFAULT_HEALTH: HealthPolicy = { attempts: 30, intervalMs: 2000 };

export interface DeployResult {
  readonly previousImage: string;
  readonly image: string;
  readonly copied: boolean;
}

function failure(command: readonly string[], result: CommandResult): Error {
  return new Error(
    `${command.slice(0, COMMAND_WORDS).join(' ')} failed (exit ${result.code}): ${result.stderr.trim()}`,
  );
}

async function check(deps: DeployDeps, command: readonly string[], options?: CommandOptions): Promise<string> {
  const result = await deps.run(command, options);
  if (result.code !== 0) {
    throw failure(command, result);
  }
  return result.stdout.trim();
}

/** An `aws ... --query <query> --output text` value about the function or its repository. */
async function awsText(deps: DeployDeps, command: readonly string[], query: string): Promise<string> {
  return check(deps, ['aws', ...command, '--query', query, '--output', 'text']);
}

/** The function's settings this deploy needs. Only the named variables are read, never printed. */
async function functionSettings(deps: DeployDeps): Promise<FunctionSettings> {
  const json = await check(deps, [
    'aws',
    'lambda',
    'get-function-configuration',
    '--function-name',
    FUNCTION_NAME,
    '--query',
    '{databaseUrl: Environment.Variables.DATABASE_URL, origin: Environment.Variables.PUBLIC_ORIGIN}',
    '--output',
    'json',
  ]);
  const settings = JSON.parse(json) as { databaseUrl: unknown; origin: unknown };
  if (typeof settings.databaseUrl !== 'string' || typeof settings.origin !== 'string') {
    throw new TypeError(`${FUNCTION_NAME} has no DATABASE_URL or PUBLIC_ORIGIN; apply infra/ first`);
  }
  deps.mask(settings.databaseUrl);
  return { databaseUrl: settings.databaseUrl, origin: settings.origin };
}

async function inEcr(deps: DeployDeps, tag: string): Promise<boolean> {
  const command = [
    'aws',
    'ecr',
    'describe-images',
    '--repository-name',
    FUNCTION_NAME,
    '--image-ids',
    `imageTag=${tag}`,
  ];
  const result = await deps.run(command);
  if (result.code === 0) {
    return true;
  }
  if (result.stderr.includes('ImageNotFoundException')) {
    return false;
  }
  throw failure(command, result);
}

/** Lambda runs single-architecture images from its own account's ECR only, and ECR tags are immutable. */
async function copyToEcr(deps: DeployDeps, tag: string, repository: string): Promise<boolean> {
  const present = await inEcr(deps, tag);
  if (present) {
    deps.log(`${repository}:${tag} is already in ECR`);
    return false;
  }
  const password = await check(deps, ['aws', 'ecr', 'get-login-password']);
  deps.mask(password);
  const [registry = repository] = repository.split('/');
  await check(deps, ['skopeo', 'login', '--username', 'AWS', '--password-stdin', registry], { stdin: password });
  deps.log(`Copying ${GHCR_IMAGE}:${tag} (linux/arm64) to ${repository}`);
  await check(deps, [
    'skopeo',
    'copy',
    '--override-os',
    'linux',
    '--override-arch',
    'arm64',
    `docker://${GHCR_IMAGE}:${tag}`,
    `docker://${repository}:${tag}`,
  ]);
  return true;
}

/** Why one health request was not a pass, or undefined when it was. */
async function healthProblem(deps: DeployDeps, url: string): Promise<string | undefined> {
  try {
    const { status, body } = await deps.get(url);
    if (status === HTTP_OK && body.includes('"ok"')) {
      deps.log(`${url}: ${body}`);
      return undefined;
    }
    return status === HTTP_OK ? `HTTP ${status} without "ok" in the body` : `HTTP ${status}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Where to check health and how patiently. */
interface HealthCheck {
  readonly url: string;
  readonly policy: HealthPolicy;
}

async function waitForHealth(deps: DeployDeps, { url, policy }: HealthCheck, attempt = 1): Promise<void> {
  const problem = await healthProblem(deps, url);
  if (problem === undefined) {
    return;
  }
  if (attempt >= policy.attempts) {
    throw new Error(`${url} not healthy after ${policy.attempts} attempts: ${problem}`);
  }
  await deps.sleep(policy.intervalMs);
  await waitForHealth(deps, { url, policy }, attempt + 1);
}

/** Before the new code takes traffic, so migrations must be safe while the previous image still serves. */
async function migrate(deps: DeployDeps, tag: string, databaseUrl: string): Promise<void> {
  deps.log(`Migrating with ${GHCR_IMAGE}:${tag}`);
  await check(deps, ['docker', 'run', '--rm', '--env', 'DATABASE_URL', `${GHCR_IMAGE}:${tag}`, 'migrate'], {
    env: { DATABASE_URL: databaseUrl },
  });
}

async function pointFunctionAt(deps: DeployDeps, image: string): Promise<void> {
  deps.log(`Pointing ${FUNCTION_NAME} at ${image}`);
  // The query keeps the function's configuration, environment included, out of the output.
  await awsText(
    deps,
    ['lambda', 'update-function-code', '--function-name', FUNCTION_NAME, '--image-uri', image],
    'LastUpdateStatus',
  );
  await check(deps, ['aws', 'lambda', 'wait', 'function-updated-v2', '--function-name', FUNCTION_NAME]);
}

/** Where images go, and the image the function runs now (logged, so a rollback knows its target). */
interface CurrentState {
  readonly repository: string;
  readonly previousImage: string;
}

async function currentState(deps: DeployDeps): Promise<CurrentState> {
  const repositoryCommand = ['ecr', 'describe-repositories', '--repository-names', FUNCTION_NAME];
  const repository = await awsText(deps, repositoryCommand, 'repositories[0].repositoryUri');
  const functionCommand = ['lambda', 'get-function', '--function-name', FUNCTION_NAME];
  const previousImage = await awsText(deps, functionCommand, 'Code.ImageUri');
  deps.log(`Running ${previousImage}`);
  return { repository, previousImage };
}

export async function deploy(
  tag: string,
  deps: DeployDeps,
  health: HealthPolicy = DEFAULT_HEALTH,
): Promise<DeployResult> {
  if (!TAG.test(tag)) {
    throw new Error(`Deploy a published sha- tag, e.g. sha-1a2b3c4; got "${tag}"`);
  }
  const { repository, previousImage } = await currentState(deps);
  const { databaseUrl, origin } = await functionSettings(deps);
  const copied = await copyToEcr(deps, tag, repository);
  await migrate(deps, tag, databaseUrl);
  const image = `${repository}:${tag}`;
  await pointFunctionAt(deps, image);
  await waitForHealth(deps, { url: new URL('/api/health', origin).href, policy: health });
  return { previousImage, image, copied };
}
