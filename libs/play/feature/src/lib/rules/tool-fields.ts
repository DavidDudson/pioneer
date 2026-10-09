import { FormulaReferences } from './formula-references/formula-references.component';
import { GrantsFields } from './grants-fields/grants-fields.component';
import { StatisticsFields } from './statistics-fields/statistics-fields.component';
import { VerdictFields } from './verdict-fields/verdict-fields.component';

/** The extra inputs each tool reads besides the main text, for the playground page to import together. */
export const TOOL_FIELDS = [FormulaReferences, GrantsFields, StatisticsFields, VerdictFields] as const;
