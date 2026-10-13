import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentLevel, ContentRegistry, Predicate, RichText } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

/** A feat as its slots read it: its level, and its prerequisites as printed and, where they parse, as a predicate. */
export interface FeatRead {
  readonly level: ContentLevel;
  readonly prerequisites: RichText | undefined;
  readonly predicate: Predicate | undefined;
}

/** What feat slots read of feats: each loaded feat, by id. */
export interface FeatContent {
  readonly feat: (id: ContentId) => FeatRead | undefined;
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
  const feats = new Map(
    registry.packs
      .flatMap((pack) => pack.otherEntries)
      .flatMap((entry): [ContentId, FeatRead][] =>
        entry.kind === ContentKind.Feat
          ? [
              [
                entry.id,
                {
                  level: entry.level,
                  prerequisites: entry.data.prerequisites,
                  predicate: entry.data.prerequisitePredicate,
                },
              ],
            ]
          : [],
      ),
  );
  return { feat: (id: ContentId): FeatRead | undefined => feats.get(id) };
}

/** What is wrong with a feat picked for a feat slot, at the slot's level: above that level, or prerequisites not met. */
export const FeatPickProblem = { TooHigh: 'too-high', Prerequisites: 'prerequisites' } as const;
export type FeatPickProblem = ValueOf<typeof FeatPickProblem>;
