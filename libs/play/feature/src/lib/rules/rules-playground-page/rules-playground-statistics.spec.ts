import { describe, expect, it } from 'vitest';

import { chooseSchema, openPlayground, pageText, secondTextArea, typeJson } from './playground-harness';

describe('RulesPlaygroundPage statistics', () => {
  it('derives statistics from definitions and inputs, term by term', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Statistics');

    const text = pageText(harness);
    expect(text).toContain('spell-dc:arcane');
    expect(text).toContain('Base 16');
    expect(text).toContain('+ @stat.spell-attack.arcane');
    expect(text).toContain('gives 6');
  });

  it('shows each modifier line: applied, suppressed by what, conditional on what, inactive', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Statistics');

    const text = pageText(harness);
    const expected = [
      'Total 19',
      'Breastplate',
      'item +4',
      'Rule element 1 beats or removes it.',
      'It holds when you are in forest.',
      'Its predicate does not hold.',
      'status -1',
    ];
    expect(expected.filter((shown) => !text.includes(shown))).toStrictEqual([]);
  });

  it('flags a statistic a set override pinned, with the computed value and who set it', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Statistics');

    const text = pageText(harness);
    const expected = [
      'Pinned',
      'Computed 15; Override 2 pinned it to 18.',
      'Set by hand',
      'Set by the GM',
      'set: 15 to 18',
      'GM blessing',
    ];
    expect(expected.filter((shown) => !text.includes(shown))).toStrictEqual([]);
  });

  it('shows a statistic cycle with text from the engine bundle and a caret', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Statistics');
    await typeJson(
      harness,
      '[{ "slug": "ac", "name": "AC", "selector": "ac", "domains": [], "base": "10 + @stat.ac", "kind": "dc" }]',
    );

    const text = pageText(harness);
    expect(text).toContain('Error');
    expect(text).toContain('“@stat.ac” at position 6 closes a loop: ac depends on itself.');
    expect(text).toContain('10 + @stat.ac\n     ^');
  });

  it('points at bad character inputs', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Statistics');

    const inputs = secondTextArea(harness);
    inputs.value = '{ "level": 3 }';
    inputs.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    expect(pageText(harness)).toContain('Character inputs');
    expect(inputs.getAttribute('aria-invalid')).toBe('true');
  });
});
