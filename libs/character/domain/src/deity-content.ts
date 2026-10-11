import { ContentKind } from '@pioneer/rules/sdk';
import type { BaseWeapon, ContentId, ContentRegistry, ContentText, DeityData, RichText } from '@pioneer/rules/sdk';

/** A deity as the sheet shows it: its name, its description (edicts and anathema among it) and its data. */
export interface DeityRead {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly description: RichText;
  readonly data: DeityData;
}

/** What the sheet reads of deities: each loaded deity, and the name a base weapon goes by. */
export interface DeityContent {
  readonly deity: (id: ContentId) => DeityRead | undefined;
  /** The name of the first loaded weapon of that base (`dagger`); undefined when none is loaded. */
  readonly weaponName: (weapon: BaseWeapon) => ContentText | undefined;
}

/** The registry's deities, and its weapons by base, for a favoured weapon's name. */
export function deityContent(registry: ContentRegistry): DeityContent {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  const deities = new Map(
    entries.flatMap((entry): [ContentId, DeityRead][] =>
      entry.kind === ContentKind.Deity
        ? [[entry.id, { id: entry.id, name: entry.name, description: entry.description, data: entry.data }]]
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
    deity: (id: ContentId): DeityRead | undefined => deities.get(id),
    weaponName: (weapon: BaseWeapon): ContentText | undefined => weapons.get(weapon),
  };
}
