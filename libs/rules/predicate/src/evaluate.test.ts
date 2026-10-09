import { describe, expect, test } from 'bun:test';

import { Predicate, RollOption } from '@pioneer/rules/sdk';

import { evaluatePredicate } from './evaluate';
import { PredicateFacts } from './facts';
import { NamespaceKind, namespaceOf, namespaceTable, RollOptionNamespace, withKnown } from './namespaces';
import { tracePredicate } from './trace';
import { Truth } from './truth';

function facts(...options: readonly string[]): PredicateFacts {
  return new PredicateFacts(options.map((option) => RollOption.parse(option)));
}

function verdict(predicate: unknown, given: PredicateFacts): Truth {
  return evaluatePredicate(Predicate.parse(predicate), given);
}

describe('evaluatePredicate', () => {
  test('an empty predicate holds', () => {
    expect(verdict([], facts())).toBe(Truth.True);
  });

  describe('plain options', () => {
    test('present is true', () => {
      expect(verdict(['self:condition:frightened'], facts('self:condition:frightened'))).toBe(Truth.True);
      expect(verdict(['terrain:forest'], facts('terrain:forest'))).toBe(Truth.True);
    });

    test('missing is false in a known namespace', () => {
      expect(verdict(['feat:shield-block'], facts())).toBe(Truth.False);
    });

    test('missing is unknown in a situational namespace', () => {
      expect(verdict(['terrain:forest'], facts())).toBe(Truth.Unknown);
    });

    test('missing is unknown in an unlisted namespace, so a gap in the table shows rather than hides', () => {
      expect(verdict(['kinetic-gate:air'], facts())).toBe(Truth.Unknown);
    });

    test('a namespace marked known per character reads missing as false', () => {
      const table = withKnown(namespaceTable({}), [RollOptionNamespace.parse('kinetic-gate')]);
      const given = new PredicateFacts([], table);
      expect(verdict(['kinetic-gate:air'], given)).toBe(Truth.False);
    });
  });

  describe('Kleene connectives', () => {
    const known = 'self:effect:rage';
    const unknown = 'terrain:forest';

    test('a top-level array is a conjunction', () => {
      expect(verdict([known, unknown], facts(known))).toBe(Truth.Unknown);
      expect(verdict([known, unknown], facts())).toBe(Truth.False);
      expect(verdict([known, unknown], facts(known, unknown))).toBe(Truth.True);
    });

    test('or is true once any side is, and unknown while one could be', () => {
      expect(verdict([{ or: [known, unknown] }], facts(known))).toBe(Truth.True);
      expect(verdict([{ or: [known, unknown] }], facts())).toBe(Truth.Unknown);
      expect(verdict([{ or: [known, 'feat:power-attack'] }], facts())).toBe(Truth.False);
    });

    test('not keeps unknown unknown', () => {
      expect(verdict([{ not: unknown }], facts())).toBe(Truth.Unknown);
      expect(verdict([{ not: known }], facts())).toBe(Truth.True);
    });

    test('nand and nor negate and and or', () => {
      expect(verdict([{ nand: [known, unknown] }], facts())).toBe(Truth.True);
      expect(verdict([{ nand: [known, unknown] }], facts(known))).toBe(Truth.Unknown);
      expect(verdict([{ nor: [known, unknown] }], facts(known))).toBe(Truth.False);
      expect(verdict([{ nor: [known, unknown] }], facts())).toBe(Truth.Unknown);
    });

    test('xor is exactly one, unknown while an unknown could change the count', () => {
      expect(verdict([{ xor: [known, 'feat:power-attack'] }], facts(known))).toBe(Truth.True);
      expect(verdict([{ xor: [known, unknown] }], facts(known))).toBe(Truth.Unknown);
      expect(verdict([{ xor: [known, 'feat:power-attack', unknown] }], facts(known, 'feat:power-attack'))).toBe(
        Truth.False,
      );
      expect(verdict([{ xor: [known, unknown] }], facts())).toBe(Truth.Unknown);
    });

    test('iff is all the same, false as soon as two differ', () => {
      expect(verdict([{ iff: [known, 'feat:power-attack'] }], facts())).toBe(Truth.True);
      expect(verdict([{ iff: [known, 'feat:power-attack'] }], facts(known))).toBe(Truth.False);
      expect(verdict([{ iff: [known, unknown] }], facts(known))).toBe(Truth.Unknown);
      expect(verdict([{ iff: [known, 'feat:power-attack', unknown] }], facts(known))).toBe(Truth.False);
      expect(verdict([{ iff: [unknown] }], facts())).toBe(Truth.True);
    });

    test('if/then is implication', () => {
      // oxlint-disable-next-line unicorn/no-thenable -- Foundry spells the conditional { if, then } (ADR-0002)
      const conditional = [{ if: known, then: unknown }];
      expect(verdict(conditional, facts())).toBe(Truth.True);
      expect(verdict(conditional, facts(known))).toBe(Truth.Unknown);
      expect(verdict(conditional, facts(known, unknown))).toBe(Truth.True);
    });
  });

  describe('comparisons, as Foundry reads them', () => {
    test('eq with a number looks for the option with that suffix', () => {
      expect(verdict([{ eq: ['self:level', 5] }], facts('self:level:5'))).toBe(Truth.True);
      expect(verdict([{ eq: ['self:level', 5] }], facts('self:level:4'))).toBe(Truth.False);
      expect(verdict([{ eq: ['self:level', 5] }], facts())).toBe(Truth.False);
    });

    test('eq with a number in a situational namespace is unknown until some value is given', () => {
      expect(verdict([{ eq: ['encounter:round', 1] }], facts())).toBe(Truth.Unknown);
      expect(verdict([{ eq: ['encounter:round', 1] }], facts('encounter:round:2'))).toBe(Truth.False);
    });

    test('eq with two options compares their text, whatever the facts', () => {
      expect(verdict([{ eq: ['self:size', 'self:size'] }], facts())).toBe(Truth.True);
      expect(verdict([{ eq: ['self:size', 'target:size'] }], facts())).toBe(Truth.False);
    });

    test('ordering compares numeric suffixes: some left value beats every right value', () => {
      const given = facts('self:level:5', 'target:level:3', 'target:level:7');
      expect(verdict([{ gte: ['self:level', 5] }], given)).toBe(Truth.True);
      expect(verdict([{ gt: ['self:level', 5] }], given)).toBe(Truth.False);
      expect(verdict([{ lt: ['self:level', 6] }], given)).toBe(Truth.True);
      expect(verdict([{ lte: ['self:level', 4] }], given)).toBe(Truth.False);
      expect(verdict([{ gt: ['self:level', 'target:level'] }], given)).toBe(Truth.False);
      expect(verdict([{ gt: ['target:level', 'self:level'] }], given)).toBe(Truth.True);
    });

    test('a missing known operand is false, a missing situational one unknown', () => {
      expect(verdict([{ gte: ['self:level', 5] }], facts())).toBe(Truth.False);
      expect(verdict([{ gte: ['target:level', 5] }], facts())).toBe(Truth.Unknown);
      expect(verdict([{ gt: ['self:level', 'target:level'] }], facts('self:level:5'))).toBe(Truth.Unknown);
      expect(verdict([{ gt: ['self:level', 'target:level'] }], facts())).toBe(Truth.False);
    });

    test('options whose last word is not a number give no value', () => {
      expect(verdict([{ gte: ['self:level', 1] }], facts('self:level:high'))).toBe(Truth.False);
    });
  });
});

describe('tracePredicate', () => {
  test('keeps every statement verdict, nested ones included', () => {
    const predicate = Predicate.parse(['self:effect:rage', { or: ['terrain:forest', 'feat:power-attack'] }]);
    const trace = tracePredicate(predicate, facts('self:effect:rage'));

    expect(trace.truth).toBe(Truth.Unknown);
    expect(trace.statements.map((statement) => statement.truth)).toEqual([Truth.True, Truth.Unknown]);
    expect(trace.statements[1]?.children.map((child) => child.truth)).toEqual([Truth.Unknown, Truth.False]);
  });
});

describe('namespaces', () => {
  test('the namespace is the first word', () => {
    expect(namespaceOf(RollOption.parse('self:condition:frightened'))).toBe(RollOptionNamespace.parse('self'));
    expect(namespaceOf(RollOption.parse('kinetic-gate:air'))).toBe(RollOptionNamespace.parse('kinetic-gate'));
  });

  test('a custom table replaces the default', () => {
    const given = new PredicateFacts([], namespaceTable({ terrain: NamespaceKind.Known }));
    expect(verdict(['terrain:forest'], given)).toBe(Truth.False);
    expect(verdict(['self:effect:rage'], given)).toBe(Truth.Unknown);
  });
});

describe('settled options', () => {
  test('a second value of a situational option can change a comparison, so callers give one value', () => {
    expect(verdict([{ gt: ['target:level', 1] }], facts('target:level:0'))).toBe(Truth.False);
    expect(verdict([{ gt: ['target:level', 1] }], facts('target:level:0', 'target:level:3'))).toBe(Truth.True);
  });
});

describe('mixed namespaces', () => {
  test('the longest listed namespace decides, so encounter facts under self stay unknown', () => {
    // Surprise Attack (rogue): first round, before the target, initiative rolled with Deception or Stealth.
    const surpriseAttack = [
      'encounter:round:1',
      { lt: ['self:participant:initiative:rank', 'target:participant:initiative:rank'] },
      { or: ['self:participant:initiative:stat:deception', 'self:participant:initiative:stat:stealth'] },
    ];
    expect(verdict(surpriseAttack, facts())).toBe(Truth.Unknown);
    expect(verdict(['self:action:trait:impulse'], facts())).toBe(Truth.Unknown);
    expect(verdict(['self:effect:rage'], facts())).toBe(Truth.False);
  });
});

describe('option values', () => {
  test('a last word that overflows to Infinity gives no value instead of throwing', () => {
    expect(verdict([{ gte: ['self:level', 1] }], facts('self:level:1e309'))).toBe(Truth.False);
  });
});
