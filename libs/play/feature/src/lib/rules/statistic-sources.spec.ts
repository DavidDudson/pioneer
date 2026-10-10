import { TestBed } from '@angular/core/testing';
import { StatisticDefinition } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { STATISTIC_DEFINITIONS, StatisticSource } from './statistic-sources';

describe('the statistic definitions loader', () => {
  it('loads the core rules pack as definitions alone, without their sources', async () => {
    const load = TestBed.inject(STATISTIC_DEFINITIONS);
    const json: unknown = JSON.parse(await load(StatisticSource.CoreRules));

    const definitions = StatisticDefinition.array().safeParse(json);
    expect(definitions.success).toBe(true);
    expect(definitions.data?.map((definition) => definition.selector)).toContain('ac');
  });
});
