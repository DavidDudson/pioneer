import { describe, expect, it, vi } from 'vitest';

import { CORE_RULES } from '../statistic-sources';
import type { LoadCoreRules } from '../statistic-sources';
import { chooseSchema, openPlayground, pageText } from './playground-harness';

const FAILED = 'The core rules pack did not load, so roll options cannot be read';

/** A load of the core rules pack that fails, as a lost chunk would. */
const failing: LoadCoreRules = async () => {
  throw new Error('chunk failed to load');
};

describe('RulesPlaygroundPage core rules', () => {
  it.each(['Predicate verdict', 'Grants'])(
    'the %s tool says so when the core rules pack fails to load',
    async (tool) => {
      const harness = await openPlayground([{ provide: CORE_RULES, useValue: failing }]);
      await chooseSchema(harness, tool);
      await vi.waitFor(() => {
        expect(pageText(harness)).toContain(FAILED);
      });
      expect(pageText(harness)).not.toContain('On the character');
      expect(pageText(harness)).not.toContain('The predicate');
    },
  );

  it('a tool that reads no roll options shows no failure', async () => {
    const harness = await openPlayground([{ provide: CORE_RULES, useValue: failing }]);
    await chooseSchema(harness, 'Formula');
    await harness.fixture.whenStable();
    expect(pageText(harness)).not.toContain(FAILED);
  });
});
