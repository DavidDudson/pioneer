import { computed } from '@angular/core';
import type { Signal } from '@angular/core';
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
  senses: { anchor: 'sheet-senses', headingKey: 'character.sheet.sensesHeading' },
  skills: { anchor: 'sheet-skills', headingKey: 'character.sheet.skillsHeading' },
  strikes: { anchor: 'sheet-strikes', headingKey: 'character.sheet.strikesHeading' },
  /** What the character can do now and ever, in the tab's mode (#353). */
  actions: { anchor: 'sheet-actions', headingKey: 'character.sheet.actionsHeading' },
  languages: { anchor: 'sheet-languages', headingKey: 'character.sheet.languagesHeading' },
  /** What the character is doing while exploring (#501). */
  explorationActivity: { anchor: 'sheet-exploration-activity', headingKey: 'character.sheet.exploration.heading' },
  /** The environments the character is in, and what they forbid (#684). */
  environments: { anchor: 'sheet-environments', headingKey: 'character.sheet.environments.heading' },
  roleplay: { anchor: 'sheet-roleplay', headingKey: 'character.sheet.roleplay.heading' },
  choices: { anchor: 'sheet-choices', headingKey: 'character.sheet.choicesHeading' },
  timeline: { anchor: 'sheet-timeline', headingKey: 'character.sheet.timelineHeading' },
  spellcasting: { anchor: 'sheet-spellcasting', headingKey: 'character.sheet.spellcastingHeading' },
  feats: { anchor: 'sheet-feats', headingKey: 'character.sheet.featsHeading' },
  features: { anchor: 'sheet-features', headingKey: 'character.sheet.featuresHeading' },
  /** The homebrew packs the character uses, chosen by its owner or by its campaign. */
  packs: { anchor: 'sheet-packs', headingKey: 'character.sheet.packsHeading' },
  /** The variant rules the character uses, chosen by its owner or by its campaign (ADR-0061). */
  variantRules: { anchor: 'sheet-variant-rules', headingKey: 'character.sheet.variantRulesHeading' },
  /** The inventory limits the character is held to, set by its owner or by its campaign (ADR-0064). */
  ruleLimits: { anchor: 'sheet-rule-limits', headingKey: 'character.sheet.ruleLimitsHeading' },
  /** What the player or GM changed by hand in the character's statistics, and why. */
  overrides: { anchor: 'sheet-overrides', headingKey: 'character.sheet.overridesHeading' },
  inventory: { anchor: 'sheet-inventory', headingKey: 'character.sheet.inventory.heading' },
  /** Rest, daily preparations, Refocus and start of session (#347). */
  rest: { anchor: 'sheet-rest', headingKey: 'character.sheet.rest.heading' },
  /** The shop, and later crafting and income (#517). */
  downtime: { anchor: 'sheet-downtime', headingKey: 'character.sheet.downtimeHeading' },
} as const satisfies Readonly<Record<string, SheetSection>>;

/**
 * Each tab's sections in page order, for its section index (play-and-campaigns.md, Sheet modes). Later stories add
 * theirs: crafting, income and retraining to Downtime.
 */
export const SHEET_TAB_SECTIONS: Readonly<Record<SheetMode, readonly SheetSection[]>> = {
  [SheetMode.Plan]: [
    SHEET_SECTIONS.identity,
    SHEET_SECTIONS.build,
    SHEET_SECTIONS.attributes,
    SHEET_SECTIONS.choices,
    SHEET_SECTIONS.timeline,
    SHEET_SECTIONS.feats,
    SHEET_SECTIONS.features,
    SHEET_SECTIONS.packs,
    SHEET_SECTIONS.variantRules,
    SHEET_SECTIONS.ruleLimits,
    SHEET_SECTIONS.overrides,
  ],
  [SheetMode.Encounter]: [
    SHEET_SECTIONS.defences,
    SHEET_SECTIONS.senses,
    SHEET_SECTIONS.skills,
    SHEET_SECTIONS.strikes,
    SHEET_SECTIONS.actions,
    SHEET_SECTIONS.spellcasting,
  ],
  [SheetMode.Exploration]: [
    SHEET_SECTIONS.roleplay,
    SHEET_SECTIONS.explorationActivity,
    SHEET_SECTIONS.environments,
    SHEET_SECTIONS.actions,
    SHEET_SECTIONS.deity,
    SHEET_SECTIONS.languages,
    SHEET_SECTIONS.inventory,
  ],
  [SheetMode.Downtime]: [SHEET_SECTIONS.rest, SHEET_SECTIONS.actions, SHEET_SECTIONS.downtime],
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

/** The path segment of a section's route below its tab: its anchor without the `sheet-` every anchor starts with. */
export function sectionPath(section: SheetSection): string {
  return section.anchor.replace(/^sheet-/u, '');
}

/** The section a tab's own address opens, by its path. */
export function firstSectionPath(mode: SheetMode): string {
  const [first] = SHEET_TAB_SECTIONS[mode];
  return first === undefined ? mode : sectionPath(first);
}

/**
 * The section of `order` the route names: the first when the route names none, or one this tab has no section by. A
 * tab renders every section and conceals all but this one, so each keeps its state while another is open.
 */
export function shownSection(
  order: readonly SheetSection[],
  path: Signal<string | undefined>,
): Signal<SheetSection | undefined> {
  return computed(() => order.find((section) => sectionPath(section) === path()) ?? order[0]);
}
