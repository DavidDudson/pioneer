import { ContentKind } from '@pioneer/rules/sdk';
import type { EnrichmentMapping, EntrySlug } from '@pioneer/rules/sdk';

/**
 * The kinds whose AoN page prints the action it grants. Class features have no AoN page (ADR-0073) and effects are not
 * entries of the book, so an action granted only by those has no page to cite.
 */
const GRANTING_KINDS: ReadonlySet<ContentKind> = new Set([
  ContentKind.Feat,
  ContentKind.Heritage,
  ContentKind.Background,
]);

/** An entry with a `GrantItem` rule for an action, and the mapping it has (if any). */
export interface ActionGranter {
  readonly kind: ContentKind;
  readonly mapping: EnrichmentMapping | undefined;
}

/** An action and every distinct entry whose rules grant it. */
export interface GrantedAction {
  readonly slug: EntrySlug;
  readonly grantedBy: readonly ActionGranter[];
}

/** What the rule decided for one pack's actions. */
export interface GrantedActionProposals {
  /** Action slug to the mapping of the one feat, heritage or background page that grants it. */
  readonly proposals: ReadonlyMap<EntrySlug, EnrichmentMapping>;
  /** Actions something grants but not to one citable page: several granters, a granter of another kind or no AoN URL. */
  readonly excepted: readonly EntrySlug[];
  /** Actions nothing grants (familiar abilities picked from a list, stat block abilities); there is no page to cite. */
  readonly unlinked: readonly EntrySlug[];
}

/**
 * Maps an action AoN has no row for to the AoN page of the feat, heritage or background that grants it, since AoN prints
 * the action inside that page. Only a `GrantItem` rule counts: a description that merely mentions the action does not
 * make the page its home. Exactly one granter must exist and it must already have an AoN URL; two candidates, a granting
 * class feature or effect, and a granter without a URL are exceptions and are never guessed.
 */
export function proposeGrantedActions(
  actions: readonly GrantedAction[],
  mapped: ReadonlySet<EntrySlug>,
): GrantedActionProposals {
  const proposals = new Map<EntrySlug, EnrichmentMapping>();
  const excepted: EntrySlug[] = [];
  const unlinked: EntrySlug[] = [];
  for (const { slug, grantedBy } of actions.filter(({ slug: candidate }) => !mapped.has(candidate))) {
    const [only] = grantedBy;
    if (grantedBy.length === 0) {
      unlinked.push(slug);
    } else if (
      grantedBy.length === 1 &&
      only !== undefined &&
      GRANTING_KINDS.has(only.kind) &&
      only.mapping?.aon !== undefined
    ) {
      proposals.set(slug, only.mapping);
    } else {
      excepted.push(slug);
    }
  }
  return { proposals, excepted, unlinked };
}
