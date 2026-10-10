import { FormulaText, parseFormula, references } from '@pioneer/rules/formula';
import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { knownReference, ReferenceKind } from './formula-reference';
import { ActorFormulaSource } from './formula-source';
import { RulesMessage } from './messages';

export const Proficiency = {
  Untrained: 'untrained',
  Trained: 'trained',
  Expert: 'expert',
  Master: 'master',
  Legendary: 'legendary',
} as const;
export type Proficiency = ValueOf<typeof Proficiency>;
export const ProficiencySchema = z.enum(Proficiency);

const SIGIL = '@';

/**
 * One rank's proficiency bonus as a formula. It may read only `@level`, since the bonus is what `@prof` reads: a
 * formula reading a statistic or another bonus would go round in circles.
 */
export const ProficiencyBonusFormula = ActorFormulaSource.check((context) => {
  const parsed = parseFormula(FormulaText.parse(context.value));
  if (!parsed.ok) {
    return;
  }
  for (const { path, position } of references(parsed.formula)) {
    if (knownReference(path)?.kind !== ReferenceKind.Level) {
      const { params } = issueParams(
        message(RulesMessage.ProficiencyBonusReference, { found: `${SIGIL}${path}`, position }),
      );
      context.issues.push({ code: 'custom', input: context.value, params });
    }
  }
});
export type ProficiencyBonusFormula = z.infer<typeof ProficiencyBonusFormula>;

/**
 * How each proficiency rank becomes a bonus: the formula `@prof.<selector>` evaluates for the rank the character
 * has. Content, not engine code, so a variant rule (Proficiency Without Level) can replace it (ADR-0024).
 */
export const ProficiencyBonusTable = z.strictObject({
  [Proficiency.Untrained]: ProficiencyBonusFormula,
  [Proficiency.Trained]: ProficiencyBonusFormula,
  [Proficiency.Expert]: ProficiencyBonusFormula,
  [Proficiency.Master]: ProficiencyBonusFormula,
  [Proficiency.Legendary]: ProficiencyBonusFormula,
});
export type ProficiencyBonusTable = z.infer<typeof ProficiencyBonusTable>;
