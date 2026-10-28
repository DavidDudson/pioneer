import { SenseAcuity } from '@pioneer/rules/sdk';

/** Message keys the senses panel renders with, spelled out so the key check sees them. */
export const SensesMessage = {
  /** "Darkvision (precise)", or "Scent (imprecise, 30 feet)": name, acuity, then any range. */
  Sense: 'rules.senses.sense',
  /** "from Plant Form": the badge on a sense a battle form gives. */
  FromForm: 'rules.senses.fromForm',
  /** What a form's name reads as while its entry has none. */
  UnnamedForm: 'rules.senses.unnamedForm',
  None: 'rules.senses.none',
  /** The disclosure over the senses the character has without its form. */
  Own: 'rules.senses.own',
} as const;

export const ACUITY_MESSAGES: Readonly<Record<SenseAcuity, string>> = {
  [SenseAcuity.Precise]: 'rules.senses.acuity.precise',
  [SenseAcuity.Imprecise]: 'rules.senses.acuity.imprecise',
  [SenseAcuity.Vague]: 'rules.senses.acuity.vague',
};
