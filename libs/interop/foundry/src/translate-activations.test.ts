import { describe, expect, test } from 'bun:test';

import { FrequencyPeriod, Uses } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import type { GapLog } from './kind-data-gaps';
import { idOf } from './testing/import-fixtures';
import { activationsOf, printedFrequency } from './translate-activations';

function freshLog(): GapLog {
  return { entry: idOf('equipment:winged-rune'), gaps: [] };
}

describe('printedFrequency', () => {
  test.each([
    ['once per day', 1, FrequencyPeriod.Day],
    ['once per hour', 1, FrequencyPeriod.Hour],
    ['three times per day', 3, FrequencyPeriod.Day],
    ['twice per 10 minutes.', 2, FrequencyPeriod.TenMinutes],
    ['once every 24 hours', 1, FrequencyPeriod.TwentyFourHours],
    ['2 times per round', 2, FrequencyPeriod.Round],
  ])('%s', (text, max, per) => {
    expect(printedFrequency(text)).toEqual({ max: Uses.parse(max), per });
  });

  test.each(['', 'sometimes', 'once per fortnight', 'zero times per day'])('%p is not a frequency', (text) => {
    expect(printedFrequency(text)).toBeUndefined();
  });
});

describe('activationsOf', () => {
  const winged =
    '<p><strong>Activate—Take to the Skies</strong> <span class="action-glyph">2</span> (concentrate)</p>' +
    '<p><strong>Frequency</strong> once per hour</p><hr /><p><strong>Effect</strong> You fly.</p>';

  test('reads a named activation and its frequency', () => {
    expect(activationsOf(winged, 'Winged', freshLog())).toEqual({
      activations: [{ slug: 'take-to-the-skies', name: 'Take to the Skies', frequency: { max: 1, per: 'hour' } }],
    });
  });

  test('an activation without a name takes the item name', () => {
    const html =
      '<p><strong>Activate</strong> <span class="action-glyph">1</span> command</p><p><strong>Frequency</strong> once per day</p>';

    expect(activationsOf(html, 'Called', freshLog())).toEqual({
      activations: [{ slug: 'called', name: 'Called', frequency: { max: 1, per: 'day' } }],
    });
  });

  test('reads each activation of an item', () => {
    const second = '<p><strong>Activate—Second Wind</strong> 1</p><p><strong>Frequency</strong> once per day</p>';

    expect(activationsOf(winged + second, 'Both', freshLog())).toMatchObject({
      activations: [{ slug: 'take-to-the-skies' }, { slug: 'second-wind' }],
    });
  });

  test('an activation with no frequency is not counted', () => {
    const log = freshLog();

    expect(activationsOf('<p><strong>Activate—Flash</strong> 1</p>', 'Flash', log)).toEqual({});
    expect(log.gaps).toEqual([]);
  });

  test('a frequency it cannot read is reported and left out', () => {
    const log = freshLog();
    const html = '<p><strong>Activate—Odd</strong> 1</p><p><strong>Frequency</strong> once per fortnight</p>';

    expect(activationsOf(html, 'Odd', log)).toEqual({});
    expect(log.gaps).toMatchObject([
      { reason: KindDataGapReason.UnmappedValue, field: 'description.frequency', raw: 'once per fortnight' },
    ]);
  });

  test('"plus overcharge" keeps the base frequency and marks the activation as overcharge, with nothing reported', () => {
    const log = freshLog();
    const html =
      '<p><strong>Activate—Spark</strong> 1</p><p><strong>Frequency</strong> Once per day, plus overcharge</p>';

    expect(activationsOf(html, 'Spark', log)).toEqual({
      activations: [{ slug: 'spark', name: 'Spark', frequency: { max: 1, per: 'day' }, overcharge: true }],
    });
    expect(log.gaps).toEqual([]);
  });

  test.each(['at will', 'any number of times per day'])(
    '%p names no limit, so nothing is counted or reported',
    (text) => {
      const log = freshLog();
      const html = `<p><strong>Activate—Free</strong> 1</p><p><strong>Frequency</strong> ${text}</p>`;

      expect(activationsOf(html, 'Free', log)).toEqual({});
      expect(log.gaps).toEqual([]);
    },
  );

  test('a description with no activation has none', () => {
    expect(activationsOf('<p>A plain rope.</p>', 'Rope', freshLog())).toEqual({});
  });
});
