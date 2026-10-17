import { ActionOriginKind, availableActions } from '@pioneer/rules/engine';
import type { ActionCandidate, AvailableAction } from '@pioneer/rules/engine';
import type { GrantEntry } from '@pioneer/rules/grants';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ActionData, ContentEntry, ContentId, ContentRegistry, Origin, Trait } from '@pioneer/rules/sdk';

import { abilityFrequencies } from './ability-frequency';
import type { CharacterDocument } from './character-document';
import { characterStatistics } from './character-statistics';
import type { StatisticSources } from './character-statistics';
import { characterGrants, characterRanks } from './class-build';
import { abilityUseKey, heldCount, useMaxima } from './counted-resources';
import { equippedGrants } from './equipped';
import { itemContent } from './inventory-content';
import { ResourceCount } from './resources';
import type { ResourcesSpent } from './resources';

/** No uses left. */
const NONE = ResourceCount.parse(0);

/** The action an entry is, or the action a feat, class feature or ancestry feature is. */
function actionOf(entry: ContentEntry): ActionData | undefined {
  if (entry.kind === ContentKind.Action) {
    return entry.data;
  }
  if (
    entry.kind === ContentKind.Feat ||
    entry.kind === ContentKind.ClassFeature ||
    entry.kind === ContentKind.AncestryFeature
  ) {
    return entry.data.action;
  }
  return undefined;
}

/** The actions already read, by registry: a registry's packs never change once loaded. */
const READ = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, ActionData>>();

/** How every action, feat, class feature and ancestry feature in the registry is used; read once per registry. */
export function abilityActions(registry: ContentRegistry): ReadonlyMap<ContentId, ActionData> {
  const existing = READ.get(registry);
  if (existing !== undefined) {
    return existing;
  }
  const read = new Map(
    registry.packs
      .flatMap((pack) => pack.otherEntries)
      .flatMap((entry): [ContentId, ActionData][] => {
        const action = actionOf(entry);
        return action === undefined ? [] : [[entry.id, action]];
      }),
  );
  READ.set(registry, read);
  return read;
}

/** The Cast a Spell action, whose use is casting. */
const CAST_A_SPELL = 'action:cast-a-spell';

/** What an ability is, for what a battle form forbids (`ActionCandidate.traits`, `ActionCandidate.casts`). */
interface AbilityNature {
  readonly traits: readonly Trait[];
  readonly casts: boolean;
}

const NATURES = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, AbilityNature>>();

/** The traits of every ability in the registry and whether it casts a spell; read once per registry. */
function abilityNatures(registry: ContentRegistry): ReadonlyMap<ContentId, AbilityNature> {
  const existing = NATURES.get(registry);
  if (existing !== undefined) {
    return existing;
  }
  const read = new Map(
    registry.packs
      .flatMap((pack) => pack.otherEntries)
      .map((entry): [ContentId, AbilityNature] => [
        entry.id,
        { traits: entry.traits, casts: entry.kind === ContentKind.Spell || entry.slug === CAST_A_SPELL },
      ]),
  );
  NATURES.set(registry, read);
  return read;
}

/** Every character has the basic and skill actions; one that rolls a skill is a skill action. */
function universalCandidates(
  actions: ReadonlyMap<ContentId, ActionData>,
  natures: ReadonlyMap<ContentId, AbilityNature>,
): readonly ActionCandidate[] {
  return [...actions].flatMap(([id, action]): ActionCandidate[] => {
    if (action.universal !== true) {
      return [];
    }
    const rolls = action.skills !== undefined && action.skills.length > 0;
    const origin = { kind: rolls ? ActionOriginKind.Skill : ActionOriginKind.Basic };
    return [{ id, action, origin, ...natures.get(id) }];
  });
}

/** An entry a character has, and the origin that put it there. */
interface GrantedEntry {
  readonly entry: GrantEntry;
  readonly origin: Origin;
}

/** The actions among the entries a character's grants put in play, each with the origin that put it there. */
function grantedCandidates(
  items: readonly GrantedEntry[],
  actions: ReadonlyMap<ContentId, ActionData>,
  natures: ReadonlyMap<ContentId, AbilityNature>,
): readonly ActionCandidate[] {
  return items.flatMap(({ entry, origin }): ActionCandidate[] => {
    const action = actions.get(entry.id);
    return action === undefined
      ? []
      : [
          {
            id: entry.id,
            action,
            origin: { kind: ActionOriginKind.Granted, source: origin },
            ...natures.get(entry.id),
          },
        ];
  });
}

/**
 * The actions of the character that have a frequency with no uses left: the uses spent against the most its feats and
 * actions allow.
 */
function spentActions(
  candidates: readonly ActionCandidate[],
  registry: ContentRegistry,
  { uses }: Pick<ResourcesSpent, 'uses'>,
): ReadonlySet<ContentId> {
  const frequencies = abilityFrequencies(registry);
  const maxima = useMaxima(
    candidates.map(({ id }) => id),
    (id) => frequencies.get(id),
  );
  return new Set(
    candidates
      .filter(({ id }) => maxima.has(abilityUseKey(id)))
      .filter(({ id }) => heldCount({ spent: uses, maxima, key: abilityUseKey(id) }) === NONE)
      .map(({ id }) => id),
  );
}

/**
 * The actions the character has right now, each with whether it can be used and why not (play-and-campaigns.md,
 * "Actions and the action economy"): the basic and skill actions every character has, those its build gives (feats,
 * class and ancestry features, and what they grant) and those its active items and conditions give, weighed against its
 * roll options, skill ranks, spent frequencies and statistics. An action on the list more than once appears once, the
 * universal offer first.
 */
export function characterActions(
  document: CharacterDocument,
  sources: StatisticSources,
  spent: Pick<ResourcesSpent, 'uses'>,
): readonly AvailableAction[] {
  const { registry, slots } = sources;
  const grants = characterGrants(document, slots);
  const equipped = equippedGrants(document, itemContent(registry), slots);
  const actions = abilityActions(registry);
  const natures = abilityNatures(registry);
  const candidates = [
    ...universalCandidates(actions, natures),
    ...grantedCandidates(grants.items, actions, natures),
    ...grantedCandidates(equipped.items, actions, natures),
  ];
  return availableActions({
    candidates,
    facts: equipped.facts,
    ranks: characterRanks(grants),
    spent: spentActions(candidates, registry, spent),
    statistics: characterStatistics(document, sources),
    form: equipped.form,
  });
}
