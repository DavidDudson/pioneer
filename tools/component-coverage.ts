/**
 * Pure helpers for the component coverage check: every frontier component has a sibling spec
 * (`<name>.component.spec.ts`) and a story in its folder (`*.stories.ts`), unless it is a part listed as
 * covered by another component's spec or story.
 */

/** Where a part's behaviour is tested or shown instead of beside it, as paths under the same root. */
export interface Exemption {
  /** Why the part has no spec or story of its own. */
  readonly reason: string;
  readonly spec?: string;
  readonly story?: string;
}

const COMPONENT = '.component.ts';
const STORY = '.stories.ts';

function directoryOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/') + 1);
}

/** The spec beside `component`: `a/b.component.ts` → `a/b.component.spec.ts`. */
export function specOf(component: string): string {
  return `${component.slice(0, -COMPONENT.length)}.component.spec.ts`;
}

function hasStory(files: ReadonlySet<string>, component: string): boolean {
  const directory = directoryOf(component);
  return [...files].some((file) => file.endsWith(STORY) && directoryOf(file) === directory);
}

/** A spec or story: what every component has beside it. */
type Companion = 'spec' | 'story';
const COMPANIONS: readonly Companion[] = ['spec', 'story'];

function hasOwn(files: ReadonlySet<string>, component: string, companion: Companion): boolean {
  return companion === 'spec' ? files.has(specOf(component)) : hasStory(files, component);
}

interface Missing {
  readonly component: string;
  readonly companion: Companion;
  /** The exemption's covering file, if the component has one for this companion. */
  readonly coveredBy: string | undefined;
}

function gapsFor(files: ReadonlySet<string>, { component, companion, coveredBy }: Missing): string[] {
  if (coveredBy === undefined) {
    return [`no ${companion}: ${component}`];
  }
  return files.has(coveredBy) ? [] : [`${companion} for ${component} points at a missing file: ${coveredBy}`];
}

function staleFor(files: ReadonlySet<string>, component: string, exemption: Exemption): string[] {
  if (!files.has(component)) {
    return [`exemption for a component that no longer exists: ${component}`];
  }
  return COMPANIONS.filter(
    (companion) => exemption[companion] !== undefined && hasOwn(files, component, companion),
  ).map((companion) => `${companion} exemption no longer needed, it has its own: ${component}`);
}

/**
 * Problems with `files` (paths relative to one root): components missing a spec or story, exemptions pointing
 * at files that don't exist, and exemptions no longer needed. Sorted.
 */
export function findCoverageGaps(
  files: ReadonlySet<string>,
  exemptions: Readonly<Record<string, Exemption>>,
): string[] {
  const components = [...files].filter((file) => file.endsWith(COMPONENT));
  const gaps = components.flatMap((component) =>
    COMPANIONS.filter((companion) => !hasOwn(files, component, companion)).flatMap((companion) =>
      gapsFor(files, { component, companion, coveredBy: exemptions[component]?.[companion] }),
    ),
  );
  const stale = Object.entries(exemptions).flatMap(([component, exemption]) => staleFor(files, component, exemption));
  return [...gaps, ...stale].toSorted();
}
