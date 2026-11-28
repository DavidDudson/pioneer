import type {
  Attribute,
  DeityDomain,
  DivineFont,
  RichText,
  Sanctification,
  SanctificationModal,
} from '@pioneer/rules/sdk';

/** Whether followers may or must be sanctified, and to what. */
export interface DeitySanctificationLine {
  readonly modal: SanctificationModal;
  readonly what: ReadonlyArray<Sanctification>;
}

/**
 * The character's deity as the sheet shows it: its name, what it grants a cleric (fonts, sanctification, domains),
 * its favoured weapons, divine attributes and skills by name, and its description, which holds its edicts and
 * anathema.
 */
export interface DeityLine {
  readonly name: string;
  readonly fonts: ReadonlyArray<DivineFont>;
  /** Absent when the deity sanctifies no one. */
  readonly sanctification?: DeitySanctificationLine;
  readonly domains: ReadonlyArray<DeityDomain>;
  readonly alternateDomains: ReadonlyArray<DeityDomain>;
  readonly favoredWeapons: ReadonlyArray<string>;
  readonly attributes: ReadonlyArray<Attribute>;
  readonly skills: ReadonlyArray<string>;
  readonly description: RichText;
}
