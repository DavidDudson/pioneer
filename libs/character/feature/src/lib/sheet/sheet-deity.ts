import type { SheetDeity } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { Selector } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import type { DeityLine } from '@pioneer/rules/ui';

import { NOT_CHOSEN } from './sheet-build';
import { spellMatches } from './sheet-prepared-spells';

/** What the deity line reads besides the deity: skill names from the registry, and a message for an unlisted weapon. */
export interface DeityLineSources {
  readonly registry: ContentRegistry;
  /** "khopesh (not in the loaded content)", for a favoured weapon no loaded weapon has the base of. */
  readonly unlistedWeapon: (weapon: string) => string;
}

/** The deity as the sheet's deity block shows it: its divine skills by name, each favoured weapon by name. */
export function sheetDeityLine(deity: SheetDeity, { registry, unlistedWeapon }: DeityLineSources): DeityLine {
  const { data } = deity;
  const skills = data.skills.map((skill) => {
    const entry = registry.statisticsFor(Selector.parse(skill)).at(-1);
    return entry === undefined ? String(skill) : String(entry.definition.name);
  });
  return {
    name: String(deity.name),
    fonts: data.font,
    ...(data.sanctification === undefined ? {} : { sanctification: data.sanctification }),
    domains: data.domains.primary,
    alternateDomains: data.domains.alternate,
    favoredWeapons: deity.favoredWeapons.map(({ weapon, name }) =>
      name === undefined ? unlistedWeapon(String(weapon)) : String(name),
    ),
    attributes: data.attributes,
    skills,
    description: deity.description,
  };
}

/** The deity picker's options for `query`: no deity first, then the deities whose name holds it. */
export function deityMatches(
  options: readonly SelectOption<string>[],
  query: string,
  noDeity: string,
): readonly SelectOption<string>[] {
  return [{ value: NOT_CHOSEN, label: noDeity }, ...spellMatches(options, query)];
}
