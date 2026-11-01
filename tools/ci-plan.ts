import * as z from 'zod';

/** One matrix entry of a CI job: what it runs, and the projects (named in `args`) that decide whether it is needed. */
export const JobEntry = z.strictObject({
  name: z.string(),
  id: z.string(),
  script: z.string().optional(),
  args: z.string(),
  /** Runs whatever changed: a check that is not about one project. */
  always: z.boolean().optional(),
});
export type JobEntry = z.infer<typeof JobEntry>;

/** `.github/ci-jobs.json`: the matrices of the `check` and `test` jobs in ci.yml. */
export const JobsFile = z.strictObject({ check: z.array(JobEntry), test: z.array(JobEntry) });
export type JobsFile = z.infer<typeof JobsFile>;

/** The `--projects` and `--exclude` an entry passes to Nx; both undefined means every project. */
export interface ProjectFilter {
  readonly projects: string | undefined;
  readonly exclude: string | undefined;
}

/** The affected projects that match `filter`. */
export type AffectedIn = (filter: ProjectFilter) => Promise<readonly string[]>;

/** The `--projects` and `--exclude` flags in an entry's `args`. */
export function filterOf(args: string): ProjectFilter {
  const flags = args.split(/\s+/v).filter((flag) => flag !== '');
  const valueOf = (name: string): string | undefined =>
    flags.find((flag) => flag.startsWith(`--${name}=`))?.slice(`--${name}=`.length);
  return { projects: valueOf('projects'), exclude: valueOf('exclude') };
}

interface Decision {
  readonly entry: JobEntry | undefined;
}

/**
 * `nx affected` has no `--projects` (Nx forwards it to the target, where vitest rejects it), so an entry that names
 * projects is handed the affected ones it covers, by `nx run-many --projects`; its `--exclude` is already applied.
 */
function resolvedArgs(args: string, affected: readonly string[]): string {
  const kept = args.split(/\s+/v).filter((flag) => flag !== '' && !/^--(?:projects|exclude)=/v.test(flag));
  return [...kept, `--projects=${affected.join(',')}`].join(' ');
}

/** The entries worth running: those that always run, and those with an affected project in their filter. */
export async function selectJobs(entries: readonly JobEntry[], affectedIn: AffectedIn): Promise<JobEntry[]> {
  const decided = await Promise.all(
    entries.map(async (entry): Promise<Decision> => {
      if (entry.always === true) {
        return { entry };
      }
      const filter = filterOf(entry.args);
      const affected = await affectedIn(filter);
      if (affected.length === 0) {
        return { entry: undefined };
      }
      const unfiltered = filter.projects === undefined && filter.exclude === undefined;
      return { entry: unfiltered ? entry : { ...entry, args: resolvedArgs(entry.args, affected) } };
    }),
  );
  return decided.flatMap(({ entry }) => (entry === undefined ? [] : [entry]));
}

/** Whether any changed file is at or under one of `prefixes`. */
export function touches(changed: readonly string[], prefixes: readonly string[]): boolean {
  return changed.some((file) => prefixes.some((prefix) => file === prefix || file.startsWith(prefix)));
}

/** The job that typechecks and builds (.github/ci-jobs.json). */
const BUILD_JOB = 'build';
const PROJECT_SOURCE = /^(?:apps|libs)\/.*\.(?:ts|html)$/v;
const SPEC_FILE = /\.(?:spec|test)\.ts$/v;
/** The job that also runs the specs under `tools/` (`bun run test:tools`), which no Nx project owns. */
const LINT_JOB = 'lint';
const TOOLS_DIRECTORY = 'tools/';

/**
 * What the plan skipped that the change needs: a plan that selects nothing for changed code is a broken plan, not a
 * clean change, and a silent one let type errors and failing specs reach main (see #1386). Empty when the plan is sound.
 */
export function planGaps(
  changed: readonly string[],
  check: readonly JobEntry[],
  test: readonly JobEntry[],
): readonly string[] {
  const gaps: string[] = [];
  if (changed.some((file) => PROJECT_SOURCE.test(file)) && !check.some(({ id }) => id === BUILD_JOB)) {
    gaps.push(`project source changed but the "${BUILD_JOB}" job (typecheck and build) is not planned`);
  }
  const specs = changed.filter((file) => SPEC_FILE.test(file));
  if (specs.some((file) => !file.startsWith(TOOLS_DIRECTORY)) && test.length === 0) {
    gaps.push('a spec or test changed but no test job is planned');
  }
  if (specs.some((file) => file.startsWith(TOOLS_DIRECTORY)) && !check.some(({ id }) => id === LINT_JOB)) {
    gaps.push(`a spec under tools/ changed but the "${LINT_JOB}" job (which runs them) is not planned`);
  }
  return gaps;
}
