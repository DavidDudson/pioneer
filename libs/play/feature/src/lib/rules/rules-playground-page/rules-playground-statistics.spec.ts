import { TestBed } from '@angular/core/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CORE_RULES, STATISTIC_DEFINITIONS, StatisticSource } from '../statistic-sources';
import {
  chooseSchema,
  openPlayground,
  pageText,
  present,
  pressIn,
  secondTextArea,
  textAreas,
  typeJson,
} from './playground-harness';

const WARM_TIMEOUT = 60_000;
// A test that loads the core rules pack renders every statistic of it, which outgrows vitest's 5s default on a runner.
const TEST_TIMEOUT = 30_000;

describe('RulesPlaygroundPage statistics', { timeout: TEST_TIMEOUT }, () => {
  // Reading the core rules pack takes seconds on a busy CI runner, longer than a test's own timeout. The pack keeps what it loads.
  beforeAll(async () => {
    await TestBed.inject(STATISTIC_DEFINITIONS)(StatisticSource.CoreRules);
    await TestBed.inject(CORE_RULES)();
    TestBed.resetTestingModule();
  }, WARM_TIMEOUT);

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
      '+4 item',
      'Breastplate counts instead.',
      'Applies when you are in forest.',
      'Does not apply: its condition does not hold.',
      '-1 status',
    ];
    expect(expected.filter((shown) => !text.includes(shown))).toStrictEqual([]);
  });

  it('flags a statistic a set override pinned, with the computed value and who set it', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Statistics');

    const text = pageText(harness);
    const expected = [
      'Pinned',
      'Set by the GM pins it to 18; computed 15.',
      'Changes and overrides',
      'override 15 → 18',
      'Set by hand',
      'GM blessing',
    ];
    expect(expected.filter((shown) => !text.includes(shown))).toStrictEqual([]);
  });

  it('loads the statistics of the core rules pack in place of the example', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Statistics');
    await pressIn(harness, 'Statistics from', 'Core rules pack');
    await vi.waitFor(() => {
      expect(pageText(harness)).toContain('save:reflex');
    });
    await harness.fixture.whenStable();

    const text = pageText(harness);
    const expected = [
      'save:will',
      'perception',
      'skill:thievery',
      '+ @prof.save.will',
      '+ @prof.skill.athletics',
      'strike:longsword',
      'strike:dagger',
      '+ @weapon.prof',
      'Item bonus of longsword',
      'spell-attack:arcane',
      'spell-dc:arcane',
      '+ @stat.spell-attack',
    ];
    expect(expected.filter((shown) => !text.includes(shown))).toStrictEqual([]);
    // The example's spell DC names its spell attack in full; the pack's reads its own entry's.
    expect(text).not.toContain('+ @stat.spell-attack.arcane');
  });

  it('shows a statistic cycle with text from the engine bundle and a caret', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Statistics');
    await typeJson(
      harness,
      '[{ "slug": "statistic:ac", "name": "AC", "selector": "ac", "domains": [], "base": "10 + @stat.ac", "kind": "dc" }]',
    );

    const text = pageText(harness);
    expect(text).toContain('Error');
    expect(text).toContain('“@stat.ac” at position 6 closes a loop: ac depends on itself.');
    expect(text).toContain('10 + @stat.ac\n     ^');
  });

  it('shows an empty state, not an empty list, when there are no statistics', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Statistics');
    await typeJson(harness, '[]');

    expect(pageText(harness)).toContain('The array has no statistics.');
    const result = present(present(harness.routeNativeElement).querySelector('pio-statistics-result'));
    expect(result.querySelector('ul')).toBeNull();
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

  it('names a weapon’s potency line where it beats a lower item bonus', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Statistics');
    await pressIn(harness, 'Statistics from', 'Core rules pack');
    await vi.waitFor(() => {
      expect(pageText(harness)).toContain('strike:longsword');
    });

    const areas = textAreas(harness);
    const inputs = present(areas.find((area) => area.value.includes('"weapons"')));
    inputs.value = inputs.value.replace('"potency": 1', '"potency": 2');
    inputs.dispatchEvent(new Event('input'));
    const rules = present(areas.find((area) => area.value.includes('Breastplate')));
    rules.value = '[{ "key": "FlatModifier", "selectors": ["strike:longsword"], "type": "item", "value": 1 }]';
    rules.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    expect(pageText(harness)).toContain('Item bonus of longsword counts instead.');
  });
});
