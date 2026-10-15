import { contentId, EntrySlug, RuleElementKey } from '@pioneer/rules/sdk';
import type { PackId } from '@pioneer/rules/sdk';

/** The pieces a focus plan is built from (ADR-0050): focus entries, the plan's element types, and a choice of spells. */

export interface FocusEntryFields {
  readonly slug: string;
  readonly tradition: string;
  readonly attribute: string;
}

/** A focus entry: where its focus spells' spell attack and DC come from. */
export function focusEntry(fields: FocusEntryFields): object {
  return { key: RuleElementKey.SpellcastingEntry, ...fields, preparation: 'focus' };
}

export const BARD = 'bard-focus';
export const CLERIC = 'cleric-focus';
export const DRUID = 'druid-focus';
export const RANGER = 'ranger-focus';
export const WITCH = 'witch-focus';
export const WIZARD = 'wizard-focus';

export const BARD_ENTRY = focusEntry({ slug: BARD, tradition: 'occult', attribute: 'cha' });
export const CLERIC_ENTRY = focusEntry({ slug: CLERIC, tradition: 'divine', attribute: 'wis' });
export const DRUID_ENTRY = focusEntry({ slug: DRUID, tradition: 'primal', attribute: 'wis' });
export const RANGER_ENTRY = focusEntry({ slug: RANGER, tradition: 'primal', attribute: 'wis' });

export const WIZARD_ENTRY = focusEntry({ slug: WIZARD, tradition: 'arcane', attribute: 'int' });

/** A focus spells element's entry, its spells by slug, and the predicate it holds on, if any. */
export interface Grant {
  readonly entry: string;
  readonly spells: readonly string[];
  readonly predicate?: readonly unknown[];
}

/** An element that names entries of the pack being imported by id. */
export type Named = (pack: PackId) => object;

/** The rule elements of one entry, before its spells are named in the pack being imported. */
export type Planned = readonly (object | Grant | Named)[];

export function isNamed(element: object | Grant | Named): element is Named {
  return typeof element === 'function';
}

export function isGrant(element: object | Grant): element is Grant {
  return 'spells' in element && !('key' in element);
}

export function focusSpells(pack: PackId, { entry, spells, predicate }: Grant): object {
  return {
    key: RuleElementKey.FocusSpells,
    entry,
    spells: spells.map((spell) => contentId(pack, EntrySlug.parse(`spell:${spell}`))),
    ...(predicate === undefined ? {} : { predicate }),
  };
}

/** One option of a choice that grants a focus spell: its value, its label, and the spells it grants. */
interface FocusOption {
  readonly value: string;
  readonly label: string;
  readonly spells: readonly string[];
  readonly predicate?: readonly unknown[];
}

/** A choice of focus spells: the flag its pick is stored under, its prompt, the focus entry, and its options. */
export interface FocusChoice {
  readonly flag: string;
  readonly prompt: string;
  readonly entry: string;
  readonly options: readonly FocusOption[];
}

/**
 * A `ChoiceSet` under `flag` whose pick becomes the roll option `<flag>:<value>`, and a focus spells element per
 * option, holding while it is picked: an Initiate Warden's warden spell, a domain.
 */
export function focusChoice({ flag, prompt, entry, options }: FocusChoice): Planned {
  return [
    {
      key: RuleElementKey.ChoiceSet,
      flag,
      rollOption: flag,
      prompt,
      choices: options.map(({ value, label, predicate }) => ({
        value,
        label,
        ...(predicate === undefined ? {} : { predicate }),
      })),
    },
    ...options.map(({ value, spells }): Grant => ({ entry, spells, predicate: [`${flag}:${value}`] })),
  ];
}
