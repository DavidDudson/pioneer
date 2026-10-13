import { SheetMode } from '@pioneer/character/domain';

/** One section of the character sheet: the anchor its heading carries and the message key naming it. */
export interface SheetSection {
  readonly anchor: string;
  readonly headingKey: string;
}

/** Every section of the sheet, each on one tab (`SHEET_TAB_SECTIONS`). */
export const SHEET_SECTIONS = {
  identity: { anchor: 'sheet-identity', headingKey: 'character.sheet.identityHeading' },
  build: { anchor: 'sheet-build', headingKey: 'character.sheet.buildHeading' },
  deity: { anchor: 'sheet-deity', headingKey: 'character.sheet.deity.heading' },
  attributes: { anchor: 'sheet-attributes', headingKey: 'character.sheet.attributesHeading' },
  defences: { anchor: 'sheet-defences', headingKey: 'character.sheet.defencesHeading' },
  skills: { anchor: 'sheet-skills', headingKey: 'character.sheet.skillsHeading' },
  strikes: { anchor: 'sheet-strikes', headingKey: 'character.sheet.strikesHeading' },
  languages: { anchor: 'sheet-languages', headingKey: 'character.sheet.languagesHeading' },
  roleplay: { anchor: 'sheet-roleplay', headingKey: 'character.sheet.roleplay.heading' },
  choices: { anchor: 'sheet-choices', headingKey: 'character.sheet.choicesHeading' },
  spellcasting: { anchor: 'sheet-spellcasting', headingKey: 'character.sheet.spellcastingHeading' },
  feats: { anchor: 'sheet-feats', headingKey: 'character.sheet.featsHeading' },
  features: { anchor: 'sheet-features', headingKey: 'character.sheet.featuresHeading' },
  inventory: { anchor: 'sheet-inventory', headingKey: 'character.sheet.inventory.heading' },
  /** The shop, and later crafting and income (#517). */
  downtime: { anchor: 'sheet-downtime', headingKey: 'character.sheet.downtimeHeading' },
} as const satisfies Readonly<Record<string, SheetSection>>;

/**
 * Each tab's sections in page order, for its section index (play-and-campaigns.md, Sheet modes). Later stories add
 * theirs: actions to Encounter, exploration activities to Exploration, crafting, income and
 * retraining to Downtime.
 */
export const SHEET_TAB_SECTIONS: Readonly<Record<SheetMode, readonly SheetSection[]>> = {
  [SheetMode.Plan]: [
    SHEET_SECTIONS.identity,
    SHEET_SECTIONS.build,
    SHEET_SECTIONS.attributes,
    SHEET_SECTIONS.choices,
    SHEET_SECTIONS.feats,
    SHEET_SECTIONS.features,
  ],
  [SheetMode.Encounter]: [
    SHEET_SECTIONS.defences,
    SHEET_SECTIONS.skills,
    SHEET_SECTIONS.strikes,
    SHEET_SECTIONS.spellcasting,
  ],
  [SheetMode.Exploration]: [
    SHEET_SECTIONS.roleplay,
    SHEET_SECTIONS.deity,
    SHEET_SECTIONS.languages,
    SHEET_SECTIONS.inventory,
  ],
  [SheetMode.Downtime]: [SHEET_SECTIONS.downtime],
};

/** One tab of the sheet: its route, below the character's, and the message key naming it. */
export interface SheetTab {
  readonly mode: SheetMode;
  readonly labelKey: string;
}

/** The tabs in order. A tab's path is its mode. */
export const SHEET_TABS: readonly SheetTab[] = [
  { mode: SheetMode.Plan, labelKey: 'character.sheet.tabs.plan' },
  { mode: SheetMode.Encounter, labelKey: 'character.sheet.tabs.encounter' },
  { mode: SheetMode.Exploration, labelKey: 'character.sheet.tabs.exploration' },
  { mode: SheetMode.Downtime, labelKey: 'character.sheet.tabs.downtime' },
];
