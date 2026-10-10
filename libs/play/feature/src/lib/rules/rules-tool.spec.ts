import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { GrantsStatus } from './grants-check';
import { VerdictStatus } from './predicate-verdict';
import { rulesExample, RulesTool } from './rules-check';
import {
  checkTool,
  EXAMPLE_FACTS,
  EXAMPLE_GRANT_LEVEL,
  EXAMPLE_GRANT_PICKS,
  EXAMPLE_GRANT_ROOTS,
  EXAMPLE_GRANT_TOGGLES,
  EXAMPLE_STATISTIC_INPUTS,
} from './rules-tool';
import type { ToolInputs } from './rules-tool';
import { StatisticsStatus } from './statistics-check';

/** The tools' inputs before the core rules pack has loaded. */
const LOADING: ToolInputs = {
  facts: EXAMPLE_FACTS,
  entries: new Map(),
  statisticInputs: EXAMPLE_STATISTIC_INPUTS,
  statisticRules: '[]',
  grantRoots: EXAMPLE_GRANT_ROOTS,
  statisticOverrides: '[]',
  grantPicks: EXAMPLE_GRANT_PICKS,
  grantToggles: EXAMPLE_GRANT_TOGGLES,
  grantLevel: EXAMPLE_GRANT_LEVEL,
  filterQuery: '',
  proficiency: undefined,
  namespaces: undefined,
};

describe(checkTool, () => {
  it('waits for the core rules pack before reading roll options', () => {
    const tools = [RulesTool.Verdict, RulesTool.Statistics, RulesTool.Grants];
    expect(tools.map((tool) => checkTool(tool, rulesExample(tool), LOADING).check.status)).toStrictEqual([
      VerdictStatus.Pending,
      StatisticsStatus.Pending,
      GrantsStatus.Pending,
    ]);
  });

  it('reads roll options with the namespaces once they load', () => {
    const loaded = { ...LOADING, namespaces: CORE_NAMESPACES };
    expect(checkTool(RulesTool.Verdict, rulesExample(RulesTool.Verdict), loaded).check.status).toBe(
      VerdictStatus.Valid,
    );
    expect(checkTool(RulesTool.Grants, rulesExample(RulesTool.Grants), loaded).check.status).toBe(GrantsStatus.Valid);
  });
});
