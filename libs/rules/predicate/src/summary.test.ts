import { describe, expect, test } from 'bun:test';

import { ContentText, Predicate, RollOption } from '@pioneer/rules/sdk';
import { predicateJson, rollOptionText } from '@pioneer/rules/sdk/testing';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { array, assert, property } from 'fast-check';

import { PredicateFacts } from './facts';
import { formatSummary, ListStyle } from './format';
import type { SummaryFormat } from './format';
import messages from './i18n/en.json';
import { PredicateMessage } from './messages';
import { SummaryKind, summarisePredicate } from './summary';
import type { PredicateSummary } from './summary';

function facts(...options: readonly string[]): PredicateFacts {
  return new PredicateFacts(options.map((option) => RollOption.parse(option)));
}

function summary(predicate: unknown, given = facts()): PredicateSummary | undefined {
  return summarisePredicate(Predicate.parse(predicate), given);
}

const phrase = (key: string, params: Record<string, string | number>): PredicateSummary => ({
  kind: SummaryKind.Phrase,
  message: message(key, params),
});

/** A vocabulary phrase: the slug, and the same with `_` for `-` as the ICU `select` key. */
const named = (key: string, slug: string): PredicateSummary => phrase(key, { name: slug.replaceAll('-', '_'), slug });

/** Formats as `key(params)` and lists as `[a & b]` or `[a | b]`, so tests see the structure. */
const DEBUG_FORMAT: SummaryFormat = {
  message: (descriptor: MessageDescriptor): string => `${descriptor.key}(${JSON.stringify(descriptor.params ?? {})})`,
  list: (items: readonly string[], style: ListStyle): string =>
    `[${items.join(style === ListStyle.Conjunction ? ' & ' : ' | ')}]`,
};

/** The summary as `DEBUG_FORMAT` text; empty when there is none. */
function formatted(result: PredicateSummary | undefined): string {
  return result === undefined ? '' : formatSummary(result, DEBUG_FORMAT);
}

/** Every message key formatting the summary asks for, wrappers included. */
function keysUsed(result: PredicateSummary | undefined): readonly string[] {
  const keys: string[] = [];
  const recording: SummaryFormat = {
    message: (descriptor: MessageDescriptor): string => {
      keys.push(descriptor.key);
      return descriptor.key;
    },
    list: (items: readonly string[]): string => items.join(','),
  };
  if (result !== undefined) {
    formatSummary(result, recording);
  }
  return keys;
}

const ENGLISH_KEYS: ReadonlySet<string> = new Set(
  Object.keys(messages.predicate.summary).map((name) => `predicate.summary.${name}`),
);

describe('summarisePredicate', () => {
  test('nothing to summarise unless the predicate is unknown', () => {
    expect(summary(['self:effect:rage'])).toBeUndefined();
    expect(summary(['self:effect:rage'], facts('self:effect:rage'))).toBeUndefined();
  });

  test('words situational options from the vocabulary, the rest of the option as the name', () => {
    expect(summary(['terrain:forest'])).toEqual(named(PredicateMessage.Terrain, 'forest'));
    expect(summary(['target:trait:undead'])).toEqual(named(PredicateMessage.TargetTrait, 'undead'));
    expect(summary(['target:mark:hunted-prey'])).toEqual(named(PredicateMessage.TargetMark, 'hunted-prey'));
  });

  test('names options the vocabulary does not know', () => {
    expect(summary(['origin:trait:fire'])).toEqual(phrase(PredicateMessage.Option, { option: 'origin:trait:fire' }));
  });

  test('drops the parts already known to hold', () => {
    // Favored Terrain while raging: the rage is known, the terrain is not.
    const given = facts('self:effect:rage');
    expect(summary(['self:effect:rage', 'terrain:forest'], given)).toEqual(named(PredicateMessage.Terrain, 'forest'));
  });

  test('joins unknown parts with and, or and unless', () => {
    const result = summary([
      { or: ['action:seek', 'terrain:forest', 'feat:power-attack'] },
      { not: 'lighting:darkness' },
    ]);
    const unlessDark = String.raw`predicate.summary.not({"summary":"predicate.summary.lighting({\"name\":\"darkness\",\"slug\":\"darkness\"})"})`;
    expect(formatted(result)).toBe(
      `[[predicate.summary.action({"name":"seek","slug":"seek"}) | predicate.summary.terrain({"name":"forest","slug":"forest"})] & ${unlessDark}]`,
    );
  });

  test('words comparisons with the option and the value', () => {
    expect(summary([{ gte: ['target:level', 5] }])).toEqual(
      phrase(PredicateMessage.GreaterOrEqual, { option: 'target:level', value: 5 }),
    );
  });

  test('reduces if/then, xor and iff to what is left to decide', () => {
    // oxlint-disable-next-line unicorn/no-thenable -- Foundry spells the conditional { if, then } (ADR-0002)
    const conditional = [{ if: 'self:effect:rage', then: 'terrain:forest' }];
    expect(summary(conditional, facts('self:effect:rage'))).toEqual(named(PredicateMessage.Terrain, 'forest'));
    expect(summary([{ xor: ['self:effect:rage', 'terrain:forest'] }], facts('self:effect:rage'))).toEqual({
      kind: SummaryKind.Not,
      part: named(PredicateMessage.Terrain, 'forest'),
    });
    expect(summary([{ iff: ['terrain:forest', 'action:seek'] }])).toMatchObject({ kind: SummaryKind.AllOrNone });
  });

  test('an authored summary replaces the generated one, only while unknown', () => {
    const authored = ContentText.parse('while you are in your favored terrain');
    const predicate = Predicate.parse(['terrain:forest']);
    expect(summarisePredicate(predicate, facts(), authored)).toEqual({ kind: SummaryKind.Authored, text: authored });
    expect(summarisePredicate(predicate, facts('terrain:forest'), authored)).toBeUndefined();
  });

  test('summarising any predicate never throws, and every key it uses is in en', () => {
    assert(
      property(predicateJson, array(rollOptionText, { maxLength: 8 }), (json, present) => {
        const result = summarisePredicate(Predicate.parse(json), facts(...present));
        expect(keysUsed(result).filter((key) => !ENGLISH_KEYS.has(key))).toEqual([]);
        expect(formatted(result)).toBeString();
      }),
    );
  });
});

describe('en vocabulary', () => {
  const texts = Object.values(messages.predicate.summary);

  test('never opens with {{, which Transloco reads as its own interpolation', () => {
    expect(texts.filter((text) => text.includes('{{'))).toEqual([]);
  });

  test('select keys have no hyphens, which ICU does not allow', () => {
    expect(texts.filter((text) => /\b[a-z]+-[a-z-]+ \{/u.test(text))).toEqual([]);
  });
});
