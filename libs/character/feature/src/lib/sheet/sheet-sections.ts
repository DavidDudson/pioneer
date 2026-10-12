/** One section of the character sheet: the anchor its heading carries and the message key naming it. */
export interface SheetSection {
  readonly anchor: string;
  readonly headingKey: string;
}

/**
 * The sheet's sections in their fixed order (play-and-campaigns.md, Sheet layout). Later epics append theirs here:
 * spells, actions, feats and features, inventory, notes.
 */
export const SHEET_SECTIONS = {
  identity: { anchor: 'sheet-identity', headingKey: 'character.sheet.identityHeading' },
  build: { anchor: 'sheet-build', headingKey: 'character.sheet.buildHeading' },
  deity: { anchor: 'sheet-deity', headingKey: 'character.sheet.deity.heading' },
  attributes: { anchor: 'sheet-attributes', headingKey: 'character.sheet.attributesHeading' },
  defences: { anchor: 'sheet-defences', headingKey: 'character.sheet.defencesHeading' },
  statistics: { anchor: 'sheet-statistics', headingKey: 'character.sheet.statisticsHeading' },
  strikes: { anchor: 'sheet-strikes', headingKey: 'character.sheet.strikesHeading' },
  skills: { anchor: 'sheet-skills', headingKey: 'character.sheet.skillsHeading' },
  languages: { anchor: 'sheet-languages', headingKey: 'character.sheet.languagesHeading' },
  choices: { anchor: 'sheet-choices', headingKey: 'character.sheet.choicesHeading' },
  spellcasting: { anchor: 'sheet-spellcasting', headingKey: 'character.sheet.spellcastingHeading' },
  features: { anchor: 'sheet-features', headingKey: 'character.sheet.featuresHeading' },
  inventory: { anchor: 'sheet-inventory', headingKey: 'character.sheet.inventory.heading' },
  /** The shop, and later crafting and income; the Downtime tab adopts it when sheet modes land (#517). */
  downtime: { anchor: 'sheet-downtime', headingKey: 'character.sheet.downtimeHeading' },
} as const satisfies Readonly<Record<string, SheetSection>>;

/** The sections in page order, for the section index. */
export const SHEET_SECTION_ORDER: readonly SheetSection[] = Object.values(SHEET_SECTIONS);
