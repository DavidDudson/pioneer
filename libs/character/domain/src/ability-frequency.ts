import type { GrantResolution } from '@pioneer/rules/grants';
import { ContentKind } from '@pioneer/rules/sdk';
import type { Activation, ContentEntry, ContentId, ContentRegistry, Frequency } from '@pioneer/rules/sdk';

import { activationMaxima, slotMaxima, useMaxima } from './counted-resources';
import type { CountedMaxima } from './counted-resources';
import type { InventoryItem } from './inventory';
import { characterSpellcasting } from './spellcasting-build';

/** Frequencies already read, by registry: a registry's packs never change once loaded. */
const READ = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, Frequency>>();

/** The frequency of the action a feat, class feature or action is, if it has one. */
function frequencyOf(entry: ContentEntry): Frequency | undefined {
  if (entry.kind === ContentKind.Action) {
    return entry.data.frequency;
  }
  if (entry.kind === ContentKind.Feat || entry.kind === ContentKind.ClassFeature) {
    return entry.data.action?.frequency;
  }
  return undefined;
}

/** The frequency of each feat, class feature and action in the registry that has one; read once per registry. */
export function abilityFrequencies(registry: ContentRegistry): ReadonlyMap<ContentId, Frequency> {
  const existing = READ.get(registry);
  if (existing !== undefined) {
    return existing;
  }
  const read = new Map(
    registry.packs
      .flatMap((pack) => pack.otherEntries)
      .flatMap((entry): [ContentId, Frequency][] => {
        const frequency = frequencyOf(entry);
        return frequency === undefined ? [] : [[entry.id, frequency]];
      }),
  );
  READ.set(registry, read);
  return read;
}

/** Activations already read, by registry, for the same reason as `READ`. */
const ACTIVATIONS_READ = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, readonly Activation[]>>();

/** The activations with a frequency an item has. */
function activationsOf(entry: ContentEntry): readonly Activation[] {
  const physical =
    entry.kind === ContentKind.Armor ||
    entry.kind === ContentKind.Consumable ||
    entry.kind === ContentKind.Equipment ||
    entry.kind === ContentKind.Rune ||
    entry.kind === ContentKind.Shield ||
    entry.kind === ContentKind.Weapon;
  return physical ? (entry.data.activations ?? []) : [];
}

/** The activations with a frequency of each item in the registry that has any; read once per registry. */
export function itemActivations(registry: ContentRegistry): ReadonlyMap<ContentId, readonly Activation[]> {
  const existing = ACTIVATIONS_READ.get(registry);
  if (existing !== undefined) {
    return existing;
  }
  const read = new Map(
    registry.packs
      .flatMap((pack) => pack.otherEntries)
      .flatMap((entry): [ContentId, readonly Activation[]][] => {
        const activations = activationsOf(entry);
        return activations.length === 0 ? [] : [[entry.id, activations]];
      }),
  );
  ACTIVATIONS_READ.set(registry, read);
  return read;
}

/** The character's items and the activations with a frequency each kind of item has. */
export interface CarriedActivations {
  readonly items: readonly InventoryItem[];
  readonly activations: ReadonlyMap<ContentId, readonly Activation[]>;
}

/**
 * What the character can spend and how much: a maximum for each rank of each spellcasting entry and pool, and for each
 * feat or action it has with a frequency and each activation with a frequency of its items, each with the boundary it
 * comes back on.
 */
export function characterCounted(
  resolution: GrantResolution,
  frequencies: ReadonlyMap<ContentId, Frequency>,
  carried: CarriedActivations,
): CountedMaxima {
  return {
    slots: slotMaxima(characterSpellcasting(resolution)),
    uses: new Map([
      ...useMaxima(
        resolution.items.map(({ entry }) => entry.id),
        (id) => frequencies.get(id),
      ),
      ...activationMaxima(carried.items, (id) => carried.activations.get(id) ?? []),
    ]),
  };
}
