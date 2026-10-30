/**
 * Tells why an AoN listing row has no entry of the same name in the packs (Epic 9.7): most are naming, not gaps. A row
 * is a variant the pack models as one entry, an item activation AoN lists on its own, a kind the packs lack, a likely
 * AoN typo, or left for review (a real gap until a person says otherwise). Nothing here guesses a gap away: a row no
 * rule explains stays in `review`.
 */

/** Why a row has no pack entry of its name. */
export type RemasterClass = 'activation' | 'variant' | 'missing-kind' | 'non-entry' | 'typo' | 'review';

/** An AoN listing row: the page type it sits under and its name. */
export interface RemasterCandidate {
  readonly type: string;
  readonly name: string;
}

/**
 * The AoN page types with no matching `ContentKind`, so none of their rows can be an entry (#1244). Equipment, Feats,
 * Spells and the like are not here: a row of those has a kind and is either explained by another rule or a gap.
 */
/** Rows of a book's page furniture, not content: a sidebar, a category index, the book's own source row. */
const NON_ENTRY_TYPES: ReadonlySet<string> = new Set(['Category Page', 'Sidebar', 'Source']);

const MISSING_KIND_TYPES: ReadonlySet<string> = new Set([
  'Animal Companion',
  'Apparitions',
  'Armor Specialization',
  'Arcane Schools',
  'Arcane Thesis',
  'Bloodlines',
  'Champion Causes',
  'Class Kits',
  'Class Sample Builds',
  'Companions',
  'Curses',
  'Diseases',
  'Doctrines',
  'Domains',
  'Druidic Orders',
  'Eidolons',
  'Epithets',
  'Familiar Abilities',
  'Hazards',
  "Hunter's Edges",
  'Hybrid Studies',
  'Ikons',
  'Implements',
  'Innovations',
  'Instincts',
  'Item Curses',
  'Languages',
  'Lessons',
  'Methodologies',
  'Monsters',
  'Muses',
  'Mysteries',
  'Patron Themes',
  'Planes',
  'Rackets',
  'Relic Gifts',
  'Research Fields',
  'Rules',
  'Set Relics',
  'Siege Weapons',
  'Swashbuckler Styles',
  'Traits',
  'Vehicles',
  'Ways',
  'Weapon Critical Specialization',
]);

/**
 * An item activation AoN lists as an action has no name of its own: the row's name is its trait list and time, however
 * it is written ("(concentrate, manipulate)", "manipulate", "1 minute (concentrate)", "concenctrate"). A real action
 * name starts with a capital, so a name with none is a trait list.
 */
const ACTIVATION_NAME = /^[\d\s(),a-z-]+$/u;

/** A precious material, alone or as armor, a shield, a weapon or an object, with its grade: "Silver Armor (Low-Grade)". */
/** A precious material at the start of a name; what follows must be an item word or a grade. */
const PRECIOUS_MATERIAL =
  /^(?:abysium|adamantine|cold iron|dawnsilver|djezet|duskwood|inubrix|noqual|orichalcum|peachwood|siccatite|silver|sovereign steel|warpglass)\b/iu;
const MATERIAL_REST = /^(?:armor|buckler|object|shield|tower shield|weapon)?\s*(?:\((?:low|standard|high)-grade\))?$/iu;
/** A tier or rune suffix: "(Greater)", "(+2 Greater Striking)". */
const TIER_SUFFIX = /\s*\((?:lesser|moderate|greater|major|true|\+\d[^)]*)\)$/iu;
const TIER_PREFIX = /^(?:lesser|moderate|greater|major|true)\s+/iu;
const GENERIC_MAGIC = /^magic (?:armor|weapon|scroll)\b/iu;
const RANKED_SCROLL = /^\d+(?:st|nd|rd|th)-rank\s+scroll$/iu;
/** Names shorter than this are too close to anything for a typo to mean much. */
const MIN_TYPO_LENGTH = 8;
const MAX_TYPO_DISTANCE = 2;

/** Lowercase words with straight apostrophes and no diacritics, as the AoN matcher reads a name. */
export function normaliseName(name: string): string {
  return name
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .replaceAll('’', "'")
    .replaceAll(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

function editDistance(left: string, right: string): number {
  const leftChars = left.split('');
  const rightChars = right.split('');
  let previous = rightChars.map((_char, index) => index + 1);
  previous.unshift(0);
  for (const [row, leftChar] of leftChars.entries()) {
    const current = [row + 1];
    for (const [column, rightChar] of rightChars.entries()) {
      const substitution = (previous[column] ?? 0) + (leftChar === rightChar ? 0 : 1);
      current.push(Math.min(substitution, (previous[column + 1] ?? 0) + 1, (current[column] ?? 0) + 1));
    }
    previous = current;
  }
  return previous.at(-1) ?? 0;
}

/** A pack name one or two edits from the row's name, in a name long enough to mean it. */
function nearTypo(name: string, packNames: ReadonlySet<string>): boolean {
  const normal = normaliseName(name);
  return (
    normal.length >= MIN_TYPO_LENGTH &&
    [...packNames].some(
      (other) =>
        Math.abs(other.length - normal.length) <= MAX_TYPO_DISTANCE && editDistance(normal, other) <= MAX_TYPO_DISTANCE,
    )
  );
}

function isVariant(name: string, packNames: ReadonlySet<string>): boolean {
  if (
    (PRECIOUS_MATERIAL.test(name) && MATERIAL_REST.test(name.replace(PRECIOUS_MATERIAL, '').trim())) ||
    GENERIC_MAGIC.test(name) ||
    RANKED_SCROLL.test(name)
  ) {
    return true;
  }
  const base = normaliseName(name.replace(TIER_SUFFIX, '').replace(TIER_PREFIX, ''));
  return base !== normaliseName(name) && packNames.has(base);
}

/**
 * Classifies one row that has no pack entry of its name. `packNames` holds the normalised names of the packs' entries
 * (`normaliseName`). A row is a non-entry when it is page furniture, an activation when it is an action row named only by its traits, a missing kind when its
 * AoN page type has no `ContentKind`, a variant when it is a precious-material grade, a tiered or runed form of a pack
 * entry, or a generic magic item, and a typo when a pack name is one or two edits away.
 */
export function classifyRemasterCandidate(
  { type, name }: RemasterCandidate,
  packNames: ReadonlySet<string>,
): RemasterClass {
  if (type === 'Action' && ACTIVATION_NAME.test(name.trim())) {
    return 'activation';
  }
  if (NON_ENTRY_TYPES.has(type)) {
    return 'non-entry';
  }
  if (MISSING_KIND_TYPES.has(type)) {
    return 'missing-kind';
  }
  if (isVariant(name, packNames)) {
    return 'variant';
  }
  return nearTypo(name, packNames) ? 'typo' : 'review';
}
