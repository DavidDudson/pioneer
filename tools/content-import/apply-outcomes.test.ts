import { describe, expect, test } from 'bun:test';

import { array, assert, boolean, constantFrom, property, record } from 'fast-check';

import { addOutcomesToText, mergeDescription, withoutOutcomes } from './apply-outcomes.ts';

const plain = (value: string): unknown => ({ type: 'text', text: value });
const success = [plain('You are unharmed.')];
const failure = [plain('You are slowed.')];
const NO_COUNTS = { added: 0, kept: 0, ambiguous: 0 };

function check(extra: Record<string, unknown> = {}): unknown {
  return { type: 'check', statistic: 'save:reflex', dc: 20, ...extra };
}

function paragraph(...content: unknown[]): unknown {
  return { type: 'paragraph', content };
}

/** A description with one check, then the per-degree paragraph that follows it. */
function described(first: unknown): readonly unknown[] {
  const label = { type: 'text', text: 'Success', marks: ['strong'] };
  return [paragraph(plain('Attempt '), first), paragraph(label, plain(' You are unharmed.'))];
}

function entry(id: string, description: unknown): Record<string, unknown> {
  return { id, pack: 'p', slug: `slug-${id}`, rules: [{ effect: 'e', predicate: ['x'] }], description };
}

/** `shape` with the outcomes the import gives it, when it gives any. */
function givenOutcomes(shape: unknown, outcome: unknown): unknown {
  return outcome === undefined ? shape : { ...(shape as object), outcomes: { success: outcome } };
}

/** A file of the entries `entries`, as JSON text. */
function fileOf(...entries: unknown[]): string {
  return JSON.stringify(entries);
}

/** The import's descriptions, by entry id. */
function importOf(...pairs: (readonly [string, unknown])[]): ReadonlyMap<string, unknown> {
  return new Map(pairs);
}

describe('mergeDescription', () => {
  test('lays the outcomes of a matching check and changes nothing else', () => {
    const committed = described(check());
    const fresh = described(check({ outcomes: { success } }));

    const result = mergeDescription(committed, fresh);

    expect(result.description).toEqual(fresh);
    expect(result.counts).toEqual({ added: 1, kept: 0, ambiguous: 0 });
    expect(withoutOutcomes(result.description)).toEqual(committed);
  });

  test('leaves a check that has outcomes already as it is', () => {
    const committed = described(check({ outcomes: { failure } }));
    const result = mergeDescription(committed, described(check({ outcomes: { success } })));

    expect(result.description).toEqual(committed);
    expect(result.counts).toEqual({ added: 0, kept: 1, ambiguous: 0 });
  });

  test('leaves a basic check alone', () => {
    const committed = described(check({ basic: true }));
    const result = mergeDescription(committed, described(check({ basic: true, outcomes: { success } })));

    expect(result.description).toEqual(committed);
    expect(result.counts).toEqual({ added: 0, kept: 1, ambiguous: 0 });
  });

  test('leaves identical checks alone when the import gives them different outcomes', () => {
    const committed = [paragraph(check(), plain(' then '), check())];
    const first = check({ outcomes: { success } });
    const second = check({ outcomes: { failure } });

    const result = mergeDescription(committed, [paragraph(first, plain(' then '), second)]);

    expect(result.description).toEqual(committed);
    expect(result.counts).toEqual({ added: 0, kept: 0, ambiguous: 2 });
  });

  test('fills identical checks that the import gives the same outcomes', () => {
    const committed = [paragraph(check(), plain(' then '), check())];
    const filled = check({ outcomes: { success } });

    const result = mergeDescription(committed, [paragraph(filled, plain(' then '), filled)]);

    expect(result.counts.added).toBe(2);
  });

  test('skips a description whose text was fixed by hand', () => {
    const committed = [paragraph(plain('Hand fixed '), check())];
    const fresh = [paragraph(plain('Attempt '), check({ outcomes: { success } }))];

    const result = mergeDescription(committed, fresh);

    expect(result.description).toEqual(committed);
    expect(result.handFixed).toBe(true);
  });

  test('takes nothing from an import that has no outcomes', () => {
    const committed = described(check());
    const result = mergeDescription(committed, described(check()));

    expect(result).toEqual({ description: committed, counts: NO_COUNTS, handFixed: false });
  });
});

describe('addOutcomesToText', () => {
  const filled = described(check({ outcomes: { success } }));

  test('adds the outcomes to the text and nothing else moves', () => {
    // The committed file keeps a hand-collapsed object on one line, which a re-serialising write would reflow.
    const collapsed = '"id": "a", "pack": "p", "slug": "slug-a", "rules": [ { "effect": "e", "predicate": ["x"] } ],';
    const body = JSON.stringify(described(check()));
    const source = `[\n  {\n    ${collapsed}\n    "description": ${body}\n  }\n]\n`;

    const fresh = importOf(['a', filled]);
    const merged = addOutcomesToText(source, fresh);

    expect(JSON.parse(merged.text)).toEqual([entry('a', filled)]);
    expect(merged.text.replace(/, "outcomes": \{[^}]*\}[^}]*\]\}/u, '')).toBe(source);
    expect(merged.report).toEqual({ added: 1, kept: 0, ambiguous: 0, handFixed: [], changed: 1 });
  });

  test('puts each outcome on its own check, however many checks and entries there are', () => {
    const two = [paragraph(check({ statistic: 'save:will' }), plain(' and '), check())];
    const will = check({ statistic: 'save:will', outcomes: { failure } });
    const freshTwo = [paragraph(will, plain(' and '), check({ outcomes: { success } }))];
    const bare = described(check());
    const source = fileOf(entry('a', bare), entry('b', two));

    const fresh = importOf(['a', filled], ['b', freshTwo]);
    const merged = addOutcomesToText(source, fresh);

    expect(JSON.parse(merged.text)).toEqual([entry('a', filled), entry('b', freshTwo)]);
    expect(merged.report.added).toBe(3);
  });

  test('leaves an entry the import does not hold, and a hand-fixed one, as they are, and names the latter', () => {
    const fixed = entry('b', [paragraph(plain('Mine '), check())]);
    const bare = described(check());
    const source = fileOf(entry('a', bare), fixed);
    const theirs = [paragraph(plain('Theirs '), check({ outcomes: { success } }))];

    const fresh = importOf(['b', theirs]);
    const merged = addOutcomesToText(source, fresh);

    expect(merged.text).toBe(source);
    expect(merged.report.handFixed).toEqual(['p/slug-b']);
  });

  test('a second run changes nothing', () => {
    const bare = described(check());
    const source = fileOf(entry('a', bare));
    const fresh = importOf(['a', filled]);
    const once = addOutcomesToText(source, fresh);

    const twice = addOutcomesToText(once.text, fresh);

    expect(twice.text).toBe(once.text);
    expect(twice.report).toMatchObject({ added: 0, kept: 1 });
  });
});

describe('the merge, with outcomes stripped, is the input', () => {
  const held = constantFrom(undefined, failure).map((outcome) =>
    outcome === undefined ? {} : { outcomes: { failure: outcome } },
  );
  const shape = record({ basic: boolean(), held }).map((each) =>
    check({ ...(each.basic ? { basic: true } : {}), ...each.held }),
  );
  const checks = array(record({ shape, outcome: constantFrom(undefined, success, failure) }), { maxLength: 5 });

  test('whatever checks the description holds and the import gives', () => {
    assert(
      property(checks, (each) => {
        const committed = [paragraph(...each.map((one) => one.shape))];
        const fresh = [paragraph(...each.map((one) => givenOutcomes(one.shape, one.outcome)))];

        const merged = mergeDescription(committed, fresh).description;

        expect(withoutOutcomes(merged)).toEqual(withoutOutcomes(committed));
      }),
    );
  });
});
