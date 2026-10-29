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
  readonly entry: JobEntry;
  readonly needed: boolean;
}

/** The entries worth running: those that always run, and those with an affected project in their filter. */
export async function selectJobs(entries: readonly JobEntry[], affectedIn: AffectedIn): Promise<JobEntry[]> {
  const decided = await Promise.all(
    entries.map(async (entry): Promise<Decision> => {
      if (entry.always === true) {
        return { entry, needed: true };
      }
      const affected = await affectedIn(filterOf(entry.args));
      return { entry, needed: affected.length > 0 };
    }),
  );
  return decided.filter(({ needed }) => needed).map(({ entry }) => entry);
}

/** Whether any changed file is at or under one of `prefixes`. */
export function touches(changed: readonly string[], prefixes: readonly string[]): boolean {
  return changed.some((file) => prefixes.some((prefix) => file === prefix || file.startsWith(prefix)));
}
