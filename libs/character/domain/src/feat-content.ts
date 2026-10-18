import { ContentKind, DEDICATION_LOCK_DEFAULT } from '@pioneer/rules/sdk';
import type { ContentId, ContentLevel, ContentRegistry, DedicationLock, Predicate, RichText } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/** A feat as its slots read it: its level, its archetype if it has one, and its prerequisites as printed and as a predicate. */
export interface FeatRead {
  readonly level: ContentLevel;
  readonly archetype: ContentId | undefined;
  readonly prerequisites: RichText | undefined;
  readonly predicate: Predicate | undefined;
}

/** An archetype as the dedication lock reads it (#467): the feat that opens it, and how many others lift the lock. */
export interface ArchetypeRead {
  readonly dedication: ContentId;
  readonly lock: DedicationLock;
  /** The feats of other sources it lists as its own, which count toward the lock like its own. */
  readonly additional: ReadonlySet<ContentId>;
}

/** What feat slots read of feats: each loaded feat, by id, and each loaded archetype. */
export interface FeatContent {
  readonly feat: (id: ContentId) => FeatRead | undefined;
  readonly archetype: (id: ContentId) => ArchetypeRead | undefined;
}

/** Feat content already read, by registry: a registry's packs never change once loaded. */
const READ = new WeakMap<ContentRegistry, FeatContent>();

/** The registry's feats; read once per registry. */
export function featContent(registry: ContentRegistry): FeatContent {
  const read = READ.get(registry) ?? readFeats(registry);
  READ.set(registry, read);
  return read;
}

function readFeats(registry: ContentRegistry): FeatContent {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  const feats = new Map(
    entries.flatMap((entry): [ContentId, FeatRead][] =>
      entry.kind === ContentKind.Feat
        ? [
            [
              entry.id,
              {
                level: entry.level,
                archetype: entry.data.archetype,
                prerequisites: entry.data.prerequisites,
                predicate: entry.data.prerequisitePredicate,
              },
            ],
          ]
        : [],
    ),
  );
  const archetypes = new Map(
    entries.flatMap((entry): [ContentId, ArchetypeRead][] =>
      entry.kind === ContentKind.Archetype
        ? [
            [
              entry.id,
              {
                dedication: entry.data.dedication,
                lock: entry.data.dedicationLock ?? DEDICATION_LOCK_DEFAULT,
                additional: new Set((entry.data.additionalFeats ?? []).map(({ feat }) => feat)),
              },
            ],
          ]
        : [],
    ),
  );
  return {
    feat: (id: ContentId): FeatRead | undefined => feats.get(id),
    archetype: (id: ContentId): ArchetypeRead | undefined => archetypes.get(id),
  };
}

/**
 * What is wrong with a feat picked for a feat slot, at the slot's level: above that level, prerequisites not met, or a
 * dedication while an earlier one still waits on its archetype's feats (#467).
 */
export const FeatPickProblem = {
  TooHigh: 'too-high',
  Prerequisites: 'prerequisites',
  DedicationLocked: 'dedication-locked',
} as const;
export type FeatPickProblem = ValueOf<typeof FeatPickProblem>;
