/**
 * A polite robot for Archives of Nethys (ADR-0071): a User-Agent that names the project and a contact, one request at
 * a time with a gap between them, conditional requests, and a stop on any refusal instead of a retry. It checks
 * `robots.txt` before it fetches anything and refuses when the file disallows the path or cannot be read.
 */
const SECOND_MS = 1000;
const STATUS_OK = 200;
const STATUS_NOT_MODIFIED = 304;
const STATUS_NOT_FOUND = 404;

/** What the robot sends and how fast. */
export interface PoliteConfig {
  readonly userAgent: string;
  readonly intervalMs: number;
  readonly fetch: typeof fetch;
  readonly sleep: (ms: number) => Promise<void>;
  readonly now: () => number;
}

/** A page's body and its `ETag`, to send back as `If-None-Match` next time. */
export interface FreshPage {
  readonly kind: 'fresh';
  readonly html: string;
  readonly etag: string | undefined;
}

export interface UnchangedPage {
  readonly kind: 'unchanged';
}

/** The server said no, or something else went wrong. The run stops; nothing is retried. */
export interface RefusedPage {
  readonly kind: 'refused';
  readonly reason: string;
}

export type PageOutcome = FreshPage | UnchangedPage | RefusedPage;

/** One `robots.txt` line as a lower-cased field and its value, without any comment. */
function directive(line: string): readonly [string, string] {
  const [field = '', ...rest] = (line.split('#')[0] ?? '').split(':');
  return [field.trim().toLowerCase(), rest.join(':').trim()];
}

/** Where a read of `robots.txt` stands: whether the current group is ours, and what it disallows so far. */
interface RobotsState {
  readonly applies: boolean;
  readonly header: boolean;
  readonly paths: readonly string[];
}

function step(state: RobotsState, line: string, product: string): RobotsState {
  const [name, value] = directive(line);
  if (name === 'user-agent') {
    const ours = value === '*' || (product !== '' && value.toLowerCase() === product);
    return { applies: (state.header && state.applies) || ours, header: true, paths: state.paths };
  }
  const disallows = state.applies && name === 'disallow' && value !== '';
  return { applies: state.applies, header: false, paths: disallows ? [...state.paths, value] : state.paths };
}

/** The paths `robots.txt` disallows for `*` and for `agent`. */
export function disallowedPaths(robots: string, agent: string): readonly string[] {
  const product = agent.split('/')[0]?.toLowerCase() ?? '';
  let state: RobotsState = { applies: false, header: false, paths: [] };
  for (const line of robots.split('\n')) {
    state = step(state, line, product);
  }
  return state.paths;
}

/** Retry-After as milliseconds, for a delay in seconds; a date or nothing is undefined. */
function retryAfterMs(header: string | null): number | undefined {
  const seconds = Number(header);
  return header !== null && Number.isFinite(seconds) ? seconds * SECOND_MS : undefined;
}

async function outcome(url: URL, response: Response): Promise<PageOutcome> {
  if (response.status === STATUS_NOT_MODIFIED) {
    return { kind: 'unchanged' };
  }
  if (response.status !== STATUS_OK) {
    const retryAfter = retryAfterMs(response.headers.get('Retry-After'));
    const advice = retryAfter === undefined ? '' : `, Retry-After ${retryAfter / SECOND_MS}s`;
    return { kind: 'refused', reason: `${url.href} answered ${response.status}${advice}` };
  }
  return { kind: 'fresh', html: await response.text(), etag: response.headers.get('ETag') ?? undefined };
}

export class PoliteClient {
  private readonly config: PoliteConfig;
  private lastRequestAt: number | undefined;
  private robots: readonly string[] | undefined;

  public constructor(config: PoliteConfig) {
    this.config = config;
  }

  private async pace(): Promise<void> {
    const last = this.lastRequestAt;
    if (last !== undefined) {
      const wait = last + this.config.intervalMs - this.config.now();
      if (wait > 0) {
        await this.config.sleep(wait);
      }
    }
    this.lastRequestAt = this.config.now();
  }

  private async request(url: URL, headers: Record<string, string>): Promise<Response> {
    await this.pace();
    return this.config.fetch(url, { headers: { 'User-Agent': this.config.userAgent, ...headers }, redirect: 'error' });
  }

  /** The disallowed paths, or a reason the robot must not go on. A missing `robots.txt` (404) allows everything. */
  private async rules(origin: string): Promise<readonly string[] | string> {
    if (this.robots !== undefined) {
      return this.robots;
    }
    const response = await this.request(new URL('/robots.txt', origin), {});
    if (response.status === STATUS_NOT_FOUND) {
      this.robots = [];
    } else if (response.status === STATUS_OK) {
      this.robots = disallowedPaths(await response.text(), this.config.userAgent);
    } else {
      return `robots.txt answered ${response.status}`;
    }
    return this.robots;
  }

  /** `url`, if `robots.txt` allows it, as a conditional request on `etag`. */
  public async get(url: URL, etag: string | undefined): Promise<PageOutcome> {
    const rules = await this.rules(url.origin);
    if (typeof rules === 'string') {
      return { kind: 'refused', reason: rules };
    }
    const target = `${url.pathname}${url.search}`;
    if (rules.some((path) => target.startsWith(path))) {
      return { kind: 'refused', reason: `robots.txt disallows ${target}` };
    }
    const response = await this.request(url, etag === undefined ? {} : { 'If-None-Match': etag });
    return outcome(url, response);
  }
}
