import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { EntrySlug, RollOption } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry, SpellEffectEntry } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import type { StatisticSources } from './character-statistics';
import { characterGrants } from './class-build';
import { equippedGrants } from './equipped';
import { itemContent } from './inventory-content';

const PRONE = RollOption.parse('self:condition:prone');
const GRABBED = RollOption.parse('self:condition:grabbed');
const RESTRAINED = RollOption.parse('self:condition:restrained');
const SHIELD_RAISED = RollOption.parse('self:effect:effect-raise-a-shield');

const STAND = EntrySlug.parse('action:stand');
const CRAWL = EntrySlug.parse('action:crawl');
const ESCAPE = EntrySlug.parse('action:escape');
const SHIELD_BLOCK = EntrySlug.parse('feat:shield-block');

const NO_SLUGS: readonly EntrySlug[] = [];

/** What a situation says about a character's actions: which it calls for, and which only it makes worth taking. */
interface ContextRule {
  /** The roll option that says the situation holds. */
  readonly option: RollOption;
  /** The actions the situation calls for, most pressing first. */
  readonly first: readonly EntrySlug[];
  /** The actions that are only worth taking while it holds. */
  readonly needs: readonly EntrySlug[];
}

/**
 * The situations that reorder a character's actions (play-and-campaigns.md, "Actions and the action economy"). Content
 * gives few actions a `requirements` predicate yet, so the sheet reads these beside them: prone puts Stand and Crawl
 * first, grabbed puts Escape first, and a raised shield enables Shield Block.
 */
const CONTEXT_RULES: readonly ContextRule[] = [
  { option: PRONE, first: [STAND, CRAWL], needs: NO_SLUGS },
  { option: GRABBED, first: [ESCAPE], needs: NO_SLUGS },
  { option: RESTRAINED, first: [ESCAPE], needs: NO_SLUGS },
  { option: SHIELD_RAISED, first: [SHIELD_BLOCK], needs: [SHIELD_BLOCK] },
];

/** How the situation reorders the actions on a character's list. */
export interface ActionContext {
  /** The actions the situation calls for, most pressing first. */
  readonly first: readonly ContentId[];
  /** The actions that need a situation that does not hold now, so are not worth taking. */
  readonly dormant: ReadonlySet<ContentId>;
}

/** The id of each entry the rules name, by slug. */
function idsBySlug(registry: ContentRegistry): ReadonlyMap<EntrySlug, ContentId> {
  const named = new Set(CONTEXT_RULES.flatMap(({ first, needs }) => [...first, ...needs]));
  return new Map(
    registry.packs
      .flatMap((pack) => pack.otherEntries)
      .filter((entry) => named.has(entry.slug))
      .map((entry): [EntrySlug, ContentId] => [entry.slug, entry.id]),
  );
}

/** The ids of `slugs` the content has, in order. */
function idsOf(slugs: readonly EntrySlug[], ids: ReadonlyMap<EntrySlug, ContentId>): readonly ContentId[] {
  return slugs.flatMap((slug): ContentId[] => {
    const id = ids.get(slug);
    return id === undefined ? [] : [id];
  });
}

/** The context the roll options `facts` hold put the actions in. */
export function actionContext(facts: PredicateFacts, registry: ContentRegistry): ActionContext {
  const ids = idsBySlug(registry);
  const holding = CONTEXT_RULES.filter(({ option }) => facts.has(option));
  const missing = CONTEXT_RULES.filter(({ option }) => !facts.has(option));
  const first = [...new Set(holding.flatMap((rule) => idsOf(rule.first, ids)))];
  const dormant = new Set(missing.flatMap((rule) => idsOf(rule.needs, ids)));
  for (const id of first) {
    dormant.delete(id);
  }
  return { first, dormant };
}

/** The context the character's conditions, items and effects put its actions in. */
export function characterActionContext(document: CharacterDocument, sources: StatisticSources): ActionContext {
  const { registry, slots } = sources;
  return actionContext(equippedGrants(document, itemContent(registry), slots).facts, registry);
}

/** The roll options the character's build sets (`feat:plant-shape` for a character with the feat), as predicates test them. */
export function characterPredicateFacts(
  document: CharacterDocument,
  sources: Pick<StatisticSources, 'slots'>,
): PredicateFacts {
  return characterGrants(document, sources.slots).facts;
}

/** Whether the character, by its roll options `facts`, is offered the effect a spell lists: it has no predicate, or `facts` satisfy it. */
export function isSpellEffectOffered(entry: SpellEffectEntry, facts: PredicateFacts | undefined): boolean {
  if (typeof entry === 'string') {
    return true;
  }
  return facts !== undefined && evaluatePredicate(entry.predicate, facts) === Truth.True;
}
