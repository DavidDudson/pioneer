import { ContentKind } from '@pioneer/rules/sdk';
import type {
  BaseWeapon,
  ContentId,
  ContentRegistry,
  ContentText,
  DeityData,
  RichText,
  SourceRef,
} from '@pioneer/rules/sdk';

/** A deity as the sheet shows it: its name, its description (edicts and anathema among it) and its data. */
export interface DeityRead {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly description: RichText;
  readonly data: DeityData;
}

/** A deity as a picker row reads it: what the sheet shows, and where it is printed. */
export interface DeityOption extends DeityRead {
  readonly sources: readonly SourceRef[];
}

/** What the sheet reads of deities: each loaded deity, and the name a base weapon goes by. */
export interface DeityContent {
  /** Every loaded deity, by name, for a picker. */
  readonly options: readonly DeityOption[];
  readonly deity: (id: ContentId) => DeityRead | undefined;
  /** The name of the first loaded weapon of that base (`dagger`); undefined when none is loaded. */
  readonly weaponName: (weapon: BaseWeapon) => ContentText | undefined;
}

/** Deity content already read, by registry: a registry's packs never change once loaded. */
const READ = new WeakMap<ContentRegistry, DeityContent>();

/** The registry's deities, and its weapons by base, for a favoured weapon's name; read once per registry. */
export function deityContent(registry: ContentRegistry): DeityContent {
  const read = READ.get(registry) ?? readDeities(registry);
  READ.set(registry, read);
  return read;
}

function readDeities(registry: ContentRegistry): DeityContent {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  const deities = new Map(
    entries.flatMap((entry): [ContentId, DeityOption][] =>
      entry.kind === ContentKind.Deity
        ? [
            [
              entry.id,
              {
                id: entry.id,
                name: entry.name,
                description: entry.description,
                data: entry.data,
                sources: entry.sources,
              },
            ],
          ]
        : [],
    ),
  );
  const weapons = new Map<BaseWeapon, ContentText>();
  for (const entry of entries) {
    const base = entry.kind === ContentKind.Weapon ? entry.data.baseItem : undefined;
    if (base !== undefined && !weapons.has(base)) {
      weapons.set(base, entry.name);
    }
  }
  return {
    options: [...deities.values()].toSorted((left, right) => left.name.localeCompare(right.name)),
    deity: (id: ContentId): DeityRead | undefined => {
      const option = deities.get(id);
      return option === undefined
        ? undefined
        : { id: option.id, name: option.name, description: option.description, data: option.data };
    },
    weaponName: (weapon: BaseWeapon): ContentText | undefined => weapons.get(weapon),
  };
}
