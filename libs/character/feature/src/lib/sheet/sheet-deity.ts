import {
  characterGrants,
  deityContent,
  DEITY_SLOT,
  needsDeity,
  rootSlotOptions,
  slotContent,
} from '@pioneer/character/domain';
import type { Character, SheetDeity } from '@pioneer/character/domain';
import { RichText, Selector } from '@pioneer/rules/sdk';
import type { ContentRegistry, DeityData } from '@pioneer/rules/sdk';
import type { DeityLine, DeityPickerRow } from '@pioneer/rules/ui';

import { NOT_CHOSEN } from './sheet-build';

/** What the deity line reads besides the deity: skill names from the registry, and a message for an unlisted weapon. */
export interface DeityLineSources {
  readonly registry: ContentRegistry;
  /** "khopesh (not in the loaded content)", for a favoured weapon no loaded weapon has the base of. */
  readonly unlistedWeapon: (weapon: string) => string;
}

/** A deity's divine skills by name; one the registry has no statistic for reads as its selector. */
function deitySkills(registry: ContentRegistry, data: DeityData): readonly string[] {
  return data.skills.map((skill) => {
    const entry = registry.statisticsFor(Selector.parse(skill)).at(-1);
    return entry === undefined ? String(skill) : String(entry.definition.name);
  });
}

/** The deity as the sheet's deity block shows it: its divine skills by name, each favoured weapon by name. */
export function sheetDeityLine(deity: SheetDeity, { registry, unlistedWeapon }: DeityLineSources): DeityLine {
  const { data } = deity;
  const skills = deitySkills(registry, data);
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

/** What the deity rows read besides the deities: words, and the character they are offered to. */
export interface DeityRowReads {
  readonly unlistedWeapon: (weapon: string) => string;
  readonly translate: (key: string) => string;
}

/**
 * The rows of the deity picker: no deity first, then every deity the slot offers, with the facts to choose by. A
 * cleric needs a divine font, which a philosophy lacks, so a deity without one stays in the table, disabled, saying
 * why.
 */
export function sheetDeityRows(
  registry: ContentRegistry,
  character: Character,
  { translate, unlistedWeapon }: DeityRowReads,
): readonly DeityPickerRow[] {
  const content = slotContent(registry);
  const offered = new Set(rootSlotOptions(character.document, content, DEITY_SLOT).map((option) => option.value));
  const cleric = needsDeity(characterGrants(character.document, content).rollOptions);
  const deities = deityContent(registry);
  const none: DeityPickerRow = {
    id: NOT_CHOSEN,
    name: translate('character.sheet.deity.none'),
    sanctification: undefined,
    fonts: [],
    domains: [],
    favoredWeapons: [],
    skills: [],
    description: RichText.parse([]),
    sources: [],
    disabledReason: undefined,
  };
  const rows = deities.options
    .filter((deity) => offered.has(deity.id))
    .map((deity): DeityPickerRow => {
      const { data } = deity;
      return {
        id: deity.id,
        name: String(deity.name),
        sanctification: data.sanctification,
        fonts: data.font,
        domains: data.domains.primary,
        favoredWeapons: data.weapons.map((weapon) => {
          const name = deities.weaponName(weapon);
          return name === undefined ? unlistedWeapon(String(weapon)) : String(name);
        }),
        skills: deitySkills(registry, data),
        description: deity.description,
        sources: deity.sources,
        disabledReason: cleric && data.font.length === 0 ? translate('character.sheet.deity.needsFont') : undefined,
      };
    });
  return [none, ...rows];
}
