import type { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';

import { chooseIn, chooseSchema, openPlayground, pageText, present, typeJson } from './playground-harness';

/** The JSON text area's current text. */
function json(harness: RouterTestingHarness): string {
  return present(harness.routeNativeElement?.querySelector('textarea')).value;
}

const KIND_EXAMPLES = [
  ['creature', 'Creature'],
  ['statistic', 'Statistic'],
] as const;

describe('RulesPlaygroundPage content entry', () => {
  it('opens on a valid ancestry entry', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content entry');

    expect(pageText(harness)).toContain('Valid.');
    expect(json(harness)).toContain('"kind": "ancestry"');
  });

  it.each(KIND_EXAMPLES)('loads a valid %s example', async (kind, label) => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content entry');
    await chooseIn(harness, 'Example', label);

    expect(json(harness)).toContain(`"kind": "${kind}"`);
    expect(pageText(harness)).toContain('Valid.');
  });

  it('names a kind with no schema', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content entry');
    await typeJson(harness, json(harness).replace('"kind": "ancestry"', '"kind": "spell"'));

    const text = pageText(harness);
    expect(text).toContain('1 problem');
    expect(text).toContain('“spell” is not a content kind Pioneer has a schema for yet.');
  });

  it('points at the envelope or data field that is wrong', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content entry');
    await typeJson(
      harness,
      json(harness).replace('"slug": "human"', '"slug": "elf"').replace('"speed": 25', '"speed": -5'),
    );

    const text = pageText(harness);
    expect(text).toContain('2 problems');
    expect(text).toContain('data.speed');
    expect(text).toContain('The id must be the one derived from player-core/elf');
  });
});
