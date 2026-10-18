import { ContentId, DedicationLock } from '@pioneer/rules/sdk';
import type { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';

import type { FeatContent } from './feat-content';

/** A dedication taken earlier that keeps another dedication out of reach: its archetype and the feats still needed. */
export interface DedicationWait {
  readonly archetype: ContentId;
  readonly needed: DedicationLock;
}

/** The loaded feats among the picks in `earlier` slots (#467); a feature's grant is not counted. */
export function featsPicked(
  choices: Readonly<Record<string, ChoiceValue>>,
  feats: FeatContent,
  earlier: readonly SlotKey[],
): ContentId[] {
  return earlier.flatMap((key): ContentId[] => {
    const id = ContentId.safeParse(choices[key]);
    return id.success && feats.feat(id.data) !== undefined ? [id.data] : [];
  });
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
