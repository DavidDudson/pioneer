import { matchKey } from './content-lookup';
import { PathbuilderName } from './import-kind';
import type { PathbuilderBuild } from './pathbuilder-export';

/** Fundamental rune grades and property rune names Pathbuilder lists on a weapon or armour. */
export interface ImportedRunes {
  readonly potency: number | undefined;
  readonly striking: number | undefined;
  readonly resilient: number | undefined;
  readonly property: readonly PathbuilderName[];
}

/** One line of the export's gear: equipment, a weapon or armour, with how it is carried. */
export interface ImportedItem {
  readonly name: PathbuilderName;
  readonly quantity: number;
  /** The player's name for it ("Caliburn"), when Pathbuilder's display differs from the base item's. */
  readonly displayName: PathbuilderName | undefined;
  /** Armour or a shield Pathbuilder lists as worn. */
  readonly worn: boolean;
  /** Pathbuilder flags gear it counts as invested; whether the item can be is content's to say. */
  readonly invested: boolean;
  readonly runes: ImportedRunes | undefined;
}

/** Coins, each as Pathbuilder wrote them. */
export interface ImportedCoins {
  readonly platinum: number;
  readonly gold: number;
  readonly silver: number;
  readonly copper: number;
}

/** Pathbuilder's armour row for "no base armour"; its runes are worn on clothing, not an armour entry. */
const UNARMORED = 'Unarmored';

/** The proficiency of an `Unarmored` row that is clothing; the same name on another proficiency is a suit Pathbuilder lost the name of. */
const UNARMORED_PROFICIENCY = 'unarmored';

/** The clothing an `Unarmored` row's runes are etched on: the base item for a character in no armour. */
const CLOTHING = "Explorer's Clothing";

/** "greater" and "major" prefix a rune word; the plain word is grade 1. */
const RUNE_GRADES: Readonly<Record<string, number>> = { '': 1, greater: 2, major: 3, true: 4 };
const RUNE_WORD = /^(?<prefix>greater|major|true)?(?<rune>striking|resilient)$/iu;

type FundamentalWord = 'striking' | 'resilient';

/** "greaterStriking" is grade 2 of striking; "striking" grade 1; "" or null none. */
function runeGrade(word: string | null | undefined, rune: FundamentalWord): number | undefined {
  const groups = RUNE_WORD.exec(word ?? '')?.groups;
  return groups?.['rune']?.toLowerCase() === rune ? RUNE_GRADES[(groups['prefix'] ?? '').toLowerCase()] : undefined;
}

/** The runes Pathbuilder wrote on one weapon or armour row. */
interface RuneRow {
  readonly pot?: number | null | undefined;
  readonly str?: string | null | undefined;
  readonly res?: string | null | undefined;
  readonly runes: readonly string[];
}

function chosen(name: string | null | undefined): PathbuilderName | undefined {
  const trimmed = name?.trim() ?? '';
  return trimmed === '' ? undefined : PathbuilderName.parse(trimmed);
}

function runesOf(row: RuneRow): ImportedRunes | undefined {
  const value: ImportedRunes = {
    potency: row.pot === null || row.pot === undefined || row.pot === 0 ? undefined : row.pot,
    striking: runeGrade(row.str, 'striking'),
    resilient: runeGrade(row.res, 'resilient'),
    property: row.runes.flatMap((name) => chosen(name) ?? []),
  };
  const any = value.potency !== undefined || value.striking !== undefined || value.resilient !== undefined;
  return any || value.property.length > 0 ? value : undefined;
}

/** The name when the display isn't the base item's own name, as in a "Caliburn" bastard sword. */
function displayName(base: string, display: string | undefined): PathbuilderName | undefined {
  const shown = chosen(display);
  return shown === undefined || matchKey(shown).includes(matchKey(base)) ? undefined : shown;
}

type Carried = Pick<ImportedItem, 'worn' | 'invested' | 'runes' | 'displayName'>;

function line(name: string, quantity: number, carried: Carried): ImportedItem[] {
  const chosenName = chosen(name);
  return chosenName === undefined || quantity === 0 ? [] : [{ name: chosenName, quantity, ...carried }];
}

type ArmorRow = PathbuilderBuild['armor'][number];

/**
 * One armour row as an item. An `Unarmored` row on the unarmored proficiency with runes is the clothing they are
 * etched on, worn when no other armour is; any other `Unarmored` row names nothing and is dropped.
 */
function armourLine(armor: ArmorRow, otherWorn: boolean): ImportedItem[] {
  const runes = runesOf(armor);
  if (armor.name !== UNARMORED) {
    return line(armor.name, armor.qty, { worn: armor.worn, invested: false, runes, displayName: undefined });
  }
  const clothing = armor.prof?.toLowerCase() === UNARMORED_PROFICIENCY && runes !== undefined;
  return clothing
    ? line(CLOTHING, armor.qty, { worn: armor.worn || !otherWorn, invested: false, runes, displayName: undefined })
    : [];
}

/** Equipment, then weapons, then armour, in export order. */
export function importedItems(build: PathbuilderBuild): ImportedItem[] {
  return [
    ...build.equipment.flatMap(([name, quantity, ...flags]) =>
      line(name, quantity, {
        worn: false,
        invested: flags.includes('Invested'),
        runes: undefined,
        displayName: undefined,
      }),
    ),
    ...build.weapons.flatMap((weapon) =>
      line(weapon.name, weapon.qty, {
        worn: false,
        invested: false,
        runes: runesOf(weapon),
        displayName: displayName(weapon.name, weapon.display),
      }),
    ),
    ...build.armor.flatMap((armor) =>
      armourLine(
        armor,
        build.armor.some(({ name, worn }) => worn && name !== UNARMORED),
      ),
    ),
  ];
}

export function importedCoins(build: PathbuilderBuild): ImportedCoins {
  const { pp = 0, gp = 0, sp = 0, cp = 0 } = build.money ?? {};
  return { platinum: pp, gold: gp, silver: sp, copper: cp };
}
