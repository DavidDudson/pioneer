import type { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';

import { chooseIn, chooseSchema, openPlayground, pageText, present, typeJson } from './playground-harness';

/** The JSON text area's current text. */
function json(harness: RouterTestingHarness): string {
  return present(harness.routeNativeElement?.querySelector('textarea')).value;
}

const KIND_EXAMPLES = [
  ['action', 'Action'],
  ['archetype', 'Archetype'],
  ['background', 'Background'],
  ['class', 'Class'],
  ['class-feature', 'Class feature'],
  ['condition', 'Condition'],
  ['creature', 'Creature'],
  ['damage-type', 'Damage type'],
  ['deity', 'Deity'],
  ['effect', 'Effect'],
  ['feat', 'Feat'],
  ['heritage', 'Heritage'],
  ['language', 'Language'],
  ['ritual', 'Ritual'],
  ['sense', 'Sense'],
  ['spell', 'Spell'],
  ['spellcasting-tradition', 'Spellcasting tradition'],
  ['statistic', 'Statistic'],
  ['trait', 'Trait'],
  ['variant-rule', 'Variant rule'],
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

  it('says which implied condition has no grant', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content entry');
    await chooseIn(harness, 'Example', 'Condition');
    await typeJson(harness, json(harness).replace(/"rules": \[[^\]]*\]/u, '"rules": []'));

    const text = pageText(harness);
    expect(text).toContain('2 problems');
    expect(text).toContain('data.implies[0]');
    expect(text).toContain('Grant this condition with a GrantItem rule too');
  });

  it('names a kind with no schema', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content entry');
    await typeJson(harness, json(harness).replace('"kind": "ancestry"', '"kind": "weapon"'));

    const text = pageText(harness);
    expect(text).toContain('1 problem');
    expect(text).toContain('“weapon” is not a content kind Pioneer has a schema for yet.');
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
