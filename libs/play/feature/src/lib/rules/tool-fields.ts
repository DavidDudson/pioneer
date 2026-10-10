import { FiltersFields } from './filters-fields/filters-fields.component';
import { FormulaReferences } from './formula-references/formula-references.component';
import { GrantsFields } from './grants-fields/grants-fields.component';
import { StatisticSourceField } from './statistic-source-field/statistic-source-field.component';
import { StatisticsFields } from './statistics-fields/statistics-fields.component';
import { VerdictFields } from './verdict-fields/verdict-fields.component';

/** The extra inputs each tool reads besides the main text, for the playground page to import together. */
export const TOOL_FIELDS = [
  FiltersFields,
  FormulaReferences,
  GrantsFields,
  StatisticSourceField,
  StatisticsFields,
  VerdictFields,
] as const;
