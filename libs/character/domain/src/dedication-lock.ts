import type { GrantedItem } from '@pioneer/rules/grants';
import { ContentId, DedicationLock, OriginHopKind, RollOption } from '@pioneer/rules/sdk';
import type { ChoiceValue, Level, SlotKey } from '@pioneer/rules/sdk';

import type { FeatContent } from './feat-content';

/** What a variant rule that lifts the dedication lock puts in play (No Dedication Lock). */
export const NO_DEDICATION_LOCK = RollOption.parse('self:dedication-lock:off');

/** The feat slots in the order they are taken: lowest level first, and in the order they are found within a level. */
export function slotsInOrder(levels: ReadonlyMap<SlotKey, Level>): SlotKey[] {
  return [...levels].toSorted(([, left], [, right]) => left - right).map(([key]) => key);
}

/** A dedication taken earlier that keeps another dedication out of reach: its archetype and the feats still needed. */
export interface DedicationWait {
  readonly archetype: ContentId;
  readonly needed: DedicationLock;
}

/** The loaded feats among the picks in `earlier` slots (#467); a feature's grant is counted by `featsGranted`. */
function featsPicked(
  choices: Readonly<Record<string, ChoiceValue>>,
  feats: FeatContent,
  earlier: readonly SlotKey[],
): ContentId[] {
  return earlier.flatMap((key): ContentId[] => {
    const id = ContentId.safeParse(choices[key]);
    return id.success && feats.feat(id.data) !== undefined ? [id.data] : [];
  });
}

/** What a character's features grant, and the keys of its feat slots, to tell a grant from a pick. */
export interface GrantedFeats {
  readonly items: readonly GrantedItem[];
  readonly featSlots: ReadonlySet<SlotKey>;
}

/**
 * The loaded feats a feature grants (#625): items whose origin does not pass through a pick in one of `featSlots`, so a
 * feat picked in a slot, or granted by one, is counted by its slot and not here. Each feat once, however many features
 * grant it, and none already in `taken`: a feat granted and also picked counts once, for the pick.
 */
function featsGranted(
  { items, featSlots }: GrantedFeats,
  feats: FeatContent,
  taken: readonly ContentId[],
): ContentId[] {
  const seen = new Set<ContentId>(taken);
  return items.flatMap(({ entry, origin }): ContentId[] => {
    const viaPick = origin.hops.some((hop) => hop.kind === OriginHopKind.Choice && featSlots.has(hop.slot));
    const id = ContentId.safeParse(entry.id);
    if (viaPick || !id.success || seen.has(id.data) || feats.feat(id.data) === undefined) {
      return [];
    }
    seen.add(id.data);
    return [id.data];
  });
}

/** The feats taken by the slot after `earlier`: the picks in `earlier` slots, then the feats features grant (#625). */
export function featsTaken(
  choices: Readonly<Record<string, ChoiceValue>>,
  feats: FeatContent,
  { earlier, granted }: { readonly earlier: readonly SlotKey[]; readonly granted: GrantedFeats },
): ContentId[] {
  const picked = featsPicked(choices, feats, earlier);
  return [...picked, ...featsGranted(granted, feats, picked)];
}

/**
 * The dedications among `taken` whose archetype has fewer of its other feats in `taken` than its lock asks for
 * (#467): Player Core's two unless the archetype says otherwise. The dedication itself is not one of the others.
 */
export function dedicationWaits(feats: FeatContent, taken: readonly ContentId[]): DedicationWait[] {
  const archetypes = taken.flatMap((id) => {
    const archetype = feats.feat(id)?.archetype;
    return archetype === undefined || feats.archetype(archetype)?.dedication !== id ? [] : [archetype];
  });
  return archetypes.flatMap((archetype): DedicationWait[] => {
    const read = feats.archetype(archetype);
    const others = taken.filter(
      (id) => (feats.feat(id)?.archetype === archetype || read?.additional.has(id) === true) && id !== read?.dedication,
    ).length;
    const needed = read === undefined ? 0 : read.lock - others;
    return needed > 0 ? [{ archetype, needed: DedicationLock.parse(needed) }] : [];
  });
}

/** The wait that keeps `feat` out of reach, if it is the dedication of an archetype other than the ones waiting. */
export function dedicationWait(
  feats: FeatContent,
  waits: readonly DedicationWait[],
  feat: ContentId,
): DedicationWait | undefined {
  const archetype = feats.feat(feat)?.archetype;
  const isDedication = archetype !== undefined && feats.archetype(archetype)?.dedication === feat;
  return isDedication ? waits.find((wait) => wait.archetype !== archetype) : undefined;
}
