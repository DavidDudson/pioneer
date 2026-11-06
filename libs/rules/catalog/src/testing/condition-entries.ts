import type { GrantEntry } from '@pioneer/rules/grants';
import { ContentEntryFile, ContentKind, slugName } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId } from '@pioneer/rules/sdk';

const file = await import('@pioneer/content/packs/player-core/condition.json');

export type ConditionEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Condition }>;

/** Every Player Core condition. */
export const conditions: readonly ConditionEntry[] = ContentEntryFile.parse(file.default).filter(
  (each): each is ConditionEntry => each.kind === ContentKind.Condition,
);

/** The sources of `entry`, of which an entry has at least one. */
function sourcesOf({ sources, slug }: ConditionEntry): GrantEntry['sources'] {
  const [first, ...rest] = sources;
  if (first === undefined) {
    throw new Error(`${slug} has no source`);
  }
  return [first, ...rest];
}

/** Every Player Core condition as grant resolution reads it. */
export const conditionGrantEntries: readonly GrantEntry[] = conditions.map((each) => ({
  id: each.id,
  kind: each.kind,
  slug: slugName(each.slug),
  name: each.name,
  rules: each.rules,
  sources: sourcesOf(each),
  rollOptions: [],
  valued: each.data.valued,
  overrides: each.data.overrides,
}));

/** The id of the Player Core condition named `name`. */
export function idNamed(name: string): ContentId {
  const found = conditions.find((each) => slugName(each.slug) === name);
  if (found === undefined) {
    throw new Error(`no Player Core condition ${name}`);
  }
  return found.id;
}
