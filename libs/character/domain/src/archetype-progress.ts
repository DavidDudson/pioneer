import { ContentId, Level } from '@pioneer/rules/sdk';
import type { DedicationLock } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { featsGranted, NO_DEDICATION_LOCK } from './dedication-lock';
import type { FeatContent } from './feat-content';
import { prerequisiteReads } from './feat-slots';
import { skillReads } from './slot-reads';
import type { SlotContent } from './slot-reads';

/** How many of an archetype's feats a character has taken. */
export const ArchetypeFeatCount = z.int().nonnegative().brand<'ArchetypeFeatCount'>();
export type ArchetypeFeatCount = z.infer<typeof ArchetypeFeatCount>;

/**
 * How one archetype stands against the dedication lock (#494): its other feats taken by the character's level against
 * the lock, and the level the lock clears at, counting what is planned and what features grant.
 */
export interface ArchetypeProgress {
  readonly archetype: ContentId;
  /** The archetype's feats other than its dedication that the character has at its level. */
  readonly taken: ArchetypeFeatCount;
  readonly lock: DedicationLock;
  /** The lowest level another archetype's dedication is legal after this one; undefined when the plan never gets there. */
  readonly clearsAt: Level | undefined;
}

/** A feat the character takes, and the level it takes it at. */
interface Taken {
  readonly id: ContentId;
  readonly level: Level;
}

const NEXT_LEVEL = 1;

/** The loaded feats picked in a feat slot, at the level the slot opens. */
function picksOf(document: CharacterDocument, content: SlotContent): Taken[] {
  const { feats, featSlotLevels } = prerequisiteReads(document, content);
  return [...featSlotLevels].flatMap(([slot, level]): Taken[] => {
    const id = ContentId.safeParse(document.build.choices[slot]);
    return id.success && feats.feat(id.data) !== undefined ? [{ id: id.data, level }] : [];
  });
}

/** The loaded feats features grant, each at the first level it is granted at and none already picked (#625). */
function grantsOf(document: CharacterDocument, content: SlotContent, picked: readonly Taken[]): Taken[] {
  const { feats, featSlotLevels } = prerequisiteReads(document, content);
  const { grantsAt } = skillReads(document, content);
  const featSlots = new Set(featSlotLevels.keys());
  const known = picked.map(({ id }) => id);
  const count = CHARACTER_LEVEL_MAX - CHARACTER_LEVEL_MIN + NEXT_LEVEL;
  return Array.from({ length: count }, (_unused, index) => Level.parse(CHARACTER_LEVEL_MIN + index)).flatMap(
    (level): Taken[] => {
      const granted = featsGranted({ items: grantsAt(level).items, featSlots }, feats, known);
      known.push(...granted);
      return granted.map((id) => ({ id, level }));
    },
  );
}

/** The archetype `feat` is the dedication of, if it is one. */
function dedicatedArchetype(feats: FeatContent, feat: ContentId): ContentId | undefined {
  const archetype = feats.feat(feat)?.archetype;
  return archetype !== undefined && feats.archetype(archetype)?.dedication === feat ? archetype : undefined;
}

/** The archetype to read, and the character's level. */
interface Reading {
  readonly archetype: ContentId;
  readonly now: Level;
}

/** `archetype`'s progress, if the character takes its dedication; `now` is the character's level. */
function progressOf(feats: FeatContent, taken: readonly Taken[], at: Reading): ArchetypeProgress[] {
  const { archetype, now } = at;
  const read = feats.archetype(archetype);
  const dedication = taken.find(({ id }) => id === read?.dedication);
  if (read === undefined || dedication === undefined) {
    return [];
  }
  const others = taken
    .filter(({ id }) => id !== read.dedication && (feats.feat(id)?.archetype === archetype || read.additional.has(id)))
    .toSorted((left, right) => left.level - right.level);
  const lifting = others.at(read.lock - NEXT_LEVEL);
  return [
    {
      archetype,
      taken: ArchetypeFeatCount.parse(others.filter(({ level }) => level <= now).length),
      lock: read.lock,
      clearsAt: lifting === undefined ? undefined : Level.parse(Math.max(lifting.level, dedication.level)),
    },
  ];
}

/**
 * Each archetype whose dedication the character takes, in the order they are taken, with its progress against the
 * lock (#494). Empty under the No Dedication Lock variant, which has no lock to show.
 */
export function archetypeProgress(document: CharacterDocument, content: SlotContent): readonly ArchetypeProgress[] {
  const reads = prerequisiteReads(document, content);
  const now = Level.parse(document.level);
  if (reads.factsAt(now).has(NO_DEDICATION_LOCK)) {
    return [];
  }
  const picked = picksOf(document, content);
  const taken = [...picked, ...grantsOf(document, content, picked)];
  const archetypes = taken
    .toSorted((left, right) => left.level - right.level)
    .map(({ id }) => dedicatedArchetype(reads.feats, id))
    .filter((archetype) => archetype !== undefined);
  return [...new Set(archetypes)].flatMap((archetype) => progressOf(reads.feats, taken, { archetype, now }));
}
