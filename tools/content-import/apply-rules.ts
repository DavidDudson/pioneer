/**
 * `just content-import --pack <pack> --book <book> --apply-rules <Key>[,<Key>...]`: brings the rule elements of the
 * given keys that a translator now covers into the committed pack without replacing it (ADR-0031: the committed pack
 * is the source, and later corrections to it stand). Only an entry whose committed backlog lists a `rule` gap of one
 * of the keys takes anything, and it takes only the import's rules of those keys that it does not hold yet,
 * appended after its own. The gaps those rules answer leave the backlog.
 */
import { BacklogGapType, BacklogItemType } from '@pioneer/interop/foundry';
import type { BacklogGap, BacklogItem } from '@pioneer/interop/foundry';
import type { ContentEntry, ContentId, RuleElement } from '@pioneer/rules/sdk';

/** The rules each entry gains. */
export type RulesMerge = ReadonlyMap<ContentId, readonly RuleElement[]>;

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function slugKey(entry: { readonly pack: string; readonly slug: string }): string {
  return `${entry.pack}/${entry.slug}`;
}

function isRuleGap(gap: BacklogGap, keys: ReadonlySet<string>): boolean {
  return gap.type === BacklogGapType.Rule && keys.has(gap.key);
}

/** The `<pack>/<slug>` of each entry the backlog lists with a `rule` gap of one of `keys`. */
export function gappedEntries(backlog: readonly BacklogItem[], keys: ReadonlySet<string>): ReadonlySet<string> {
  return new Set(
    backlog.flatMap((item) =>
      item.type === BacklogItemType.Entry && item.gaps.some((gap) => isRuleGap(gap, keys)) ? [slugKey(item)] : [],
    ),
  );
}

/** The entries (`<pack>/<slug>`) with a rule gap to answer, and the keys whose rules answer it. */
export interface Gapped {
  readonly gapped: ReadonlySet<string>;
  readonly keys: ReadonlySet<string>;
}

export function mergeRules(
  committed: readonly ContentEntry[],
  fresh: readonly ContentEntry[],
  { gapped, keys }: Gapped,
): RulesMerge {
  const imported = new Map(fresh.map((entry) => [entry.id, entry]));
  const gained = committed.flatMap((entry) => {
    const incoming = imported.get(entry.id);
    if (incoming === undefined || !gapped.has(slugKey(entry))) {
      return [];
    }
    const added = incoming.rules.filter((rule) => keys.has(rule.key) && !entry.rules.some((each) => same(each, rule)));
    return added.length > 0 ? [[entry.id, [...entry.rules, ...added]] as const] : [];
  });
  return new Map(gained);
}

/** `entries` with the rules `merge` gives them. */
export function withMergedRules(entries: readonly unknown[], merge: RulesMerge): readonly unknown[] {
  return entries.map((entry) => {
    const id = typeof entry === 'object' && entry !== null && 'id' in entry ? entry.id : undefined;
    const merged = typeof id === 'string' ? merge.get(id as ContentId) : undefined;
    if (merged === undefined) {
      return entry;
    }
    // The entry keeps its own rules as written, so their key order does not churn; only the rules it gains are added.
    const own: readonly unknown[] = Array.isArray((entry as { rules?: unknown }).rules)
      ? (entry as { rules: unknown[] }).rules
      : [];
    return { ...(entry as object), rules: [...own, ...merged.slice(own.length)] };
  });
}

/**
 * The entries (`<pack>/<slug>`) whose gaps of `keys` may be cleared: those with such a gap that the import holds, whether
 * they gained a rule or the import now translates, holds or drops the element on purpose. And the keys.
 */
export interface AppliedRules {
  readonly merged: ReadonlySet<string>;
  readonly keys: ReadonlySet<string>;
}

/**
 * The committed backlog less the `rule` gaps of `keys` that the import no longer reports for an entry in `merged`;
 * items left with no gaps and no reason to be left out go. Everything else stays.
 */
export function clearAppliedGaps(
  committed: readonly BacklogItem[],
  fresh: readonly BacklogItem[],
  { merged, keys }: AppliedRules,
): readonly BacklogItem[] {
  const stillGaps = new Map(
    fresh.flatMap((item) => (item.type === BacklogItemType.Entry ? [[slugKey(item), item.gaps] as const] : [])),
  );
  return committed.flatMap((item) => {
    if (item.type !== BacklogItemType.Entry || !merged.has(slugKey(item))) {
      return [item];
    }
    const remaining = stillGaps.get(slugKey(item)) ?? [];
    const gaps = item.gaps.filter((gap) => !isRuleGap(gap, keys) || remaining.some((each) => same(each, gap)));
    return gaps.length === 0 && item.leftOut === undefined ? [] : [{ ...item, gaps }];
  });
}
