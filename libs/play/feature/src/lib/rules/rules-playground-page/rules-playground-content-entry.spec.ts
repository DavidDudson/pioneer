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
  ['armor', 'Armor'],
  ['background', 'Background'],
  ['class', 'Class'],
  ['class-feature', 'Class feature'],
  ['condition', 'Condition'],
  ['consumable', 'Consumable'],
  ['creature', 'Creature'],
  ['damage-type', 'Damage type'],
  ['deity', 'Deity'],
  ['effect', 'Effect'],
  ['equipment', 'Equipment'],
  ['feat', 'Feat'],
  ['heritage', 'Heritage'],
  ['kit', 'Kit'],
  ['language', 'Language'],
  ['ritual', 'Ritual'],
  ['rune', 'Rune'],
  ['sense', 'Sense'],
  ['shield', 'Shield'],
  ['spell', 'Spell'],
  ['spellcasting-tradition', 'Spellcasting tradition'],
  ['statistic', 'Statistic'],
  ['trait', 'Trait'],
  ['treasure', 'Treasure'],
  ['variant-rule', 'Variant rule'],
  ['weapon', 'Weapon'],
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
    await typeJson(harness, json(harness).replace('"kind": "ancestry"', '"kind": "hazard"'));

    const text = pageText(harness);
    expect(text).toContain('1 problem');
    expect(text).toContain('“hazard” is not a content kind Pioneer has a schema for yet.');
  });

  it('says which source cites a book that is not registered', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content entry');
    await typeJson(harness, json(harness).replace('"book": "player-core"', '"book": "core-rulebook"'));

    const text = pageText(harness);
    expect(text).toContain('1 problem');
    expect(text).toContain('sources[0].book');
    expect(text).toContain(
      'player-core/human cites core-rulebook in sources[0], but core-rulebook is not in the book registry. Cite a registered book, or add core-rulebook to the registry.',
    );
  });

  it('shows a valid entry’s source line', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content entry');

    expect(pageText(harness)).toContain('Player Core p. 1');
  });

  it('links a source’s AoN entry, named for the book and page', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content entry');
    const aon = 'https://2e.aonprd.com/Ancestries.aspx?ID=64';
    await typeJson(harness, json(harness).replace('"page": 1', `"page": 1, "aon": "${aon}"`));

    const link = present(harness.routeNativeElement?.querySelector(`a[href="${aon}"]`));
    expect(link.textContent).toBe('AoN');
    expect(link.getAttribute('aria-label')).toBe('AoN: Player Core page 1 on Archives of Nethys');
  });

  it('shows no source line while a source is wrong', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content entry');
    await typeJson(harness, json(harness).replace('"book": "player-core"', '"book": "core-rulebook"'));

    expect(harness.routeNativeElement?.querySelector('pio-source-line')).toBeNull();
    expect(pageText(harness)).not.toContain('Unknown book');
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
