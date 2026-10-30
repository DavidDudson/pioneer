import { computed, inject, Injectable } from '@angular/core';
import { itemContent } from '@pioneer/character/domain';
import type { ItemContent } from '@pioneer/character/domain';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentKind } from '@pioneer/rules/sdk';
import type { BaseWeapon, WeaponCategory, WeaponGroup } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { contentRegistryQuery } from './content-registry-query';

/** A kind of weapon the generate dialog can theme on, with the category and group its weapons share. */
export interface WeaponBase {
  readonly base: BaseWeapon;
  readonly name: string;
  readonly category: WeaponCategory;
  readonly group: WeaponGroup | undefined;
}

/**
 * The weapon bases `content` holds (longsword, shortbow), each once and named by the first weapon that has it, by name.
 * A specific magic weapon is left out: it is a base with its runes already on.
 */
export function weaponBases(content: ItemContent): readonly WeaponBase[] {
  const bases = new Map<BaseWeapon, WeaponBase>();
  const named = [...content.values()].flatMap((entry): WeaponBase[] => {
    const isBare = entry.kind === ContentKind.Weapon && entry.data.runes === undefined;
    const { baseItem: base, category, group } = isBare ? entry.data : {};
    return base === undefined || category === undefined ? [] : [{ base, name: entry.name, category, group }];
  });
  for (const weapon of named) {
    const held = bases.get(weapon.base);
    if (held === undefined || weapon.name.localeCompare(held.name) < 0) {
      bases.set(weapon.base, weapon);
    }
  }
  return [...bases.values()].toSorted((left, right) => left.name.localeCompare(right.name));
}

/** The weapon bases of every official pack, loaded on first use and kept for the session. */
@Injectable({ providedIn: 'root' })
export class WeaponBaseOptions {
  readonly #content = inject(ContentLoader);
  readonly #registry = injectQuery(() => contentRegistryQuery(this.#content, [ContentKind.Weapon]));

  /** Every weapon base, by name; none while the content loads. */
  public readonly bases = computed((): readonly WeaponBase[] => {
    const registry = this.#registry.data();
    return registry === undefined ? [] : weaponBases(itemContent(registry));
  });
}
