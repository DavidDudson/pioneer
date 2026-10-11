/** One section of the character sheet: the anchor its heading carries and the message key naming it. */
export interface SheetSection {
  readonly anchor: string;
  readonly headingKey: string;
}

/**
 * The sheet's sections in their fixed order (play-and-campaigns.md, Sheet layout). Later epics append theirs here:
 * skills, Strikes, spells, actions, feats and features, inventory, notes.
 */
export const SHEET_SECTIONS = {
  identity: { anchor: 'sheet-identity', headingKey: 'character.sheet.identityHeading' },
  attributes: { anchor: 'sheet-attributes', headingKey: 'character.sheet.attributesHeading' },
  defences: { anchor: 'sheet-defences', headingKey: 'character.sheet.defencesHeading' },
  statistics: { anchor: 'sheet-statistics', headingKey: 'character.sheet.statisticsHeading' },
} as const satisfies Readonly<Record<string, SheetSection>>;

/** The sections in page order, for the section index. */
export const SHEET_SECTION_ORDER: readonly SheetSection[] = Object.values(SHEET_SECTIONS);
