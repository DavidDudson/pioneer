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
import { Negated, SummaryKind, summarisePredicate } from './summary';
import type { PredicateSummary } from './summary';

function facts(...options: readonly string[]): PredicateFacts {
  return new PredicateFacts(options.map((option) => RollOption.parse(option)));
}

function summary(predicate: unknown, given = facts()): PredicateSummary | undefined {
  return summarisePredicate(Predicate.parse(predicate), given);
}

/**
 * Formats a message as its last key word, `!` when negated, and its subject (`terrain(forest)`, `terrain!(forest)`),
 * and lists as `[a & b]` or `[a | b]`, so tests read the structure.
 */
const DEBUG_FORMAT: SummaryFormat = {
  message: (descriptor: MessageDescriptor): string => {
    const params = descriptor.params ?? {};
    const name = descriptor.key.slice(descriptor.key.lastIndexOf('.') + 1);
    const negated = params['negated'] === 'yes' ? '!' : '';
    const subject = params['slug'] ?? params['list'] ?? `${params['option']}${params['value'] ?? ''}`;
    return `${name}${negated}(${subject})`;
  },
  list: (items: readonly string[], style: ListStyle): string =>
    `[${items.join(style === ListStyle.Conjunction ? ' & ' : ' | ')}]`,
};

/** The summary as `DEBUG_FORMAT` text; empty when there is none. */
function formatted(predicate: unknown, given = facts()): string {
  const result = summary(predicate, given);
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

  test('words situational options from the vocabulary, with the slug and its select key', () => {
    expect(summary(['target:mark:hunted-prey'])).toEqual({
      kind: SummaryKind.Phrase,
      message: message(PredicateMessage.TargetMark, { name: 'hunted_prey', slug: 'hunted-prey', negated: Negated.No }),
    });
    expect(formatted(['terrain:forest'])).toBe('terrain(forest)');
    expect(formatted(['target:trait:undead'])).toBe('targetTrait(undead)');
  });

  test('names options the vocabulary does not know, and words comparisons', () => {
    expect(formatted(['origin:trait:fire'])).toBe('option(origin:trait:fire)');
    expect(formatted([{ gte: ['target:level', 5] }])).toBe('greaterOrEqual(target:level5)');
  });

  test('drops the parts already known to hold', () => {
    expect(formatted(['self:effect:rage', 'terrain:forest'], facts('self:effect:rage'))).toBe('terrain(forest)');
  });

  test('pushes negation down to the phrases', () => {
    expect(formatted([{ not: 'lighting:darkness' }])).toBe('lighting!(darkness)');
    expect(formatted([{ not: { not: 'lighting:darkness' } }])).toBe('lighting(darkness)');
    expect(formatted([{ nor: ['terrain:forest', 'action:seek'] }])).toBe('[terrain!(forest) & action!(seek)]');
    expect(formatted([{ nand: ['terrain:forest', 'action:seek'] }])).toBe('[terrain!(forest) | action!(seek)]');
  });

  test('introduces a list nested in another, so its scope is clear', () => {
    expect(formatted(['terrain:forest', { or: ['action:seek', 'action:hide'] }])).toBe(
      '[terrain(forest) & either([action(seek) | action(hide)])]',
    );
    expect(formatted([{ or: ['terrain:forest', { and: ['action:seek', 'lighting:darkness'] }] }])).toBe(
      '[terrain(forest) | both([action(seek) & lighting(darkness)])]',
    );
  });

  test('if/then reads as "not the condition, or the consequence", unlike nor', () => {
    // oxlint-disable-next-line unicorn/no-thenable -- Foundry spells the conditional { if, then } (ADR-0002)
    const conditional = [{ if: 'terrain:forest', then: 'action:seek' }];
    expect(formatted(conditional)).toBe('[terrain!(forest) | action(seek)]');
    expect(formatted(conditional, facts('terrain:forest'))).toBe('action(seek)');
    // oxlint-disable-next-line unicorn/no-thenable -- Foundry spells the conditional { if, then } (ADR-0002)
    expect(formatted([{ if: 'terrain:forest', then: 'feat:power-attack' }])).toBe('terrain!(forest)');
  });

  test('reduces xor and iff to what is left to decide', () => {
    expect(formatted([{ xor: ['self:effect:rage', 'terrain:forest'] }], facts('self:effect:rage'))).toBe(
      'terrain!(forest)',
    );
    expect(formatted([{ xor: ['self:effect:rage', 'terrain:forest'] }])).toBe('terrain(forest)');
    expect(formatted([{ xor: ['terrain:forest', 'action:seek'] }])).toBe(
      'exactlyOne([terrain(forest) & action(seek)])',
    );
    expect(formatted([{ iff: ['terrain:forest', 'action:seek'] }])).toBe('allOrNone([terrain(forest) & action(seek)])');
    expect(formatted([{ iff: ['self:effect:rage', 'terrain:forest'] }])).toBe('terrain!(forest)');
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
