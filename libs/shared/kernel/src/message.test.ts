import { describe, expect, test } from 'bun:test';

import { z } from 'zod';

import messages from './i18n/en.json';
import { fieldIssues, issueMessage, issueParams, message, ProblemMessage, ValidationMessage } from './message';
import type { MessageDescriptor } from './message';
import { Pg } from './pg';

const unknownAncestry = message('character.validation.unknownAncestry', { ancestry: 'gnoll' });
const atLeastThree = z.string().min(3);
const atMostTwenty = z.number().max(20);
const aNumber = z.number();
const aUuid = z.uuid();
const multipleOfFive = z.number().multipleOf(5);
const aOrB = z.enum(['a', 'b']);
const carriesOwn = z.string().refine(() => false, issueParams(unknownAncestry));
const plainEnglish = z.string().refine(() => false, 'Plain English');
const decimal = Pg.numeric(4, 2);
const named = z.object({ name: z.string().min(1) });
const strict = z.strictObject({ name: z.string() });
const stringOrNumber = z.union([z.string(), z.number()]);
const lowercase = z.string().regex(/^[a-z]+$/u);
const tagged = z.discriminatedUnion('kind', [z.object({ kind: z.literal('a') }), z.object({ kind: z.literal('b') })]);

interface Case {
  readonly name: string;
  readonly schema: z.ZodType;
  readonly value: unknown;
  readonly expected: MessageDescriptor;
}

const cases: readonly Case[] = [
  {
    name: 'too short',
    schema: atLeastThree,
    value: 'ab',
    expected: message(ValidationMessage.TooSmall, { origin: 'string', minimum: 3 }),
  },
  {
    name: 'too big',
    schema: atMostTwenty,
    value: 25,
    expected: message(ValidationMessage.TooBig, { origin: 'number', maximum: 20 }),
  },
  {
    name: 'wrong type',
    schema: aNumber,
    value: 'x',
    expected: message(ValidationMessage.InvalidType, { expected: 'number' }),
  },
  {
    name: 'bad format',
    schema: aUuid,
    value: 'nope',
    expected: message(ValidationMessage.InvalidFormat, { format: 'uuid' }),
  },
  {
    name: 'not a multiple',
    schema: multipleOfFive,
    value: 7,
    expected: message(ValidationMessage.NotMultipleOf, { divisor: 5 }),
  },
  { name: 'not an option', schema: aOrB, value: 'c', expected: message(ValidationMessage.InvalidValue) },
  { name: 'custom with its own descriptor', schema: carriesOwn, value: 'gnoll', expected: unknownAncestry },
  { name: 'custom with English only', schema: plainEnglish, value: 'x', expected: message(ValidationMessage.Invalid) },
  {
    name: 'unknown keys',
    schema: strict,
    value: { name: 'x', extra: 1, more: 2 },
    expected: message(ValidationMessage.UnrecognizedKeys, { count: 2, keys: 'extra, more' }),
  },
  {
    name: 'no union member matches',
    schema: stringOrNumber,
    value: true,
    expected: message(ValidationMessage.NoMatch),
  },
  {
    name: 'unknown discriminator',
    schema: tagged,
    value: { kind: 'c' },
    expected: message(ValidationMessage.InvalidValue),
  },
  {
    name: 'decimal codec',
    schema: decimal,
    value: '123.456',
    expected: message(ValidationMessage.Decimal, { precision: 4, scale: 2 }),
  },
];

function issuesOf(schema: z.ZodType, value: unknown): readonly z.core.$ZodIssue[] {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues;
}

function described(schema: z.ZodType, value: unknown): readonly MessageDescriptor[] {
  return issuesOf(schema, value).map((issue) => issueMessage(issue));
}

function unknownKey(key: string): MessageDescriptor {
  return message(ValidationMessage.UnrecognizedKeys, { count: 1, keys: key });
}

function hasKey(key: string): boolean {
  const [group = '', name = ''] = key.split('.');
  const table: Readonly<Record<string, Readonly<Record<string, string>>>> = messages;
  return table[group]?.[name] !== undefined;
}

describe('issueMessage', () => {
  test.each([...cases])('$name', ({ schema, value, expected }: Case) => {
    expect(described(schema, value)).toStrictEqual([expected]);
  });
});

describe('fieldIssues', () => {
  test('keeps the path and replaces the text with a descriptor', () => {
    const issues = issuesOf(named, { name: '' });
    const tooShort = message(ValidationMessage.TooSmall, { origin: 'string', minimum: 1 });
    expect(fieldIssues(issues)).toStrictEqual([{ path: ['name'], message: tooShort }]);
  });

  test('a union whose options all fail alike reports that failure', () => {
    const tag = z.union([lowercase.brand<'A'>(), lowercase.brand<'B'>()]);
    const issues = issuesOf(z.object({ tag }), { tag: 'X' });
    expect(fieldIssues(issues)).toStrictEqual([
      { path: ['tag'], message: message(ValidationMessage.InvalidFormat, { format: 'regex' }) },
    ]);
  });

  test('a union whose options fail differently reports no match', () => {
    const issues = issuesOf(z.object({ value: stringOrNumber }), { value: true });
    expect(fieldIssues(issues)).toStrictEqual([{ path: ['value'], message: message(ValidationMessage.NoMatch) }]);
  });

  test('a union reports the one option that takes the value’s type', () => {
    const value = z.union([aOrB, named]);
    const issues = issuesOf(z.object({ value }), { value: 'c' });
    expect(fieldIssues(issues)).toStrictEqual([{ path: ['value'], message: message(ValidationMessage.InvalidValue) }]);
  });

  test('a union reports the one option that got inside the value', () => {
    const value = z.union([aOrB, named]);
    const issues = issuesOf(z.object({ value }), { value: { name: '' } });
    const tooShort = message(ValidationMessage.TooSmall, { origin: 'string', minimum: 1 });
    expect(fieldIssues(issues)).toStrictEqual([{ path: ['value', 'name'], message: tooShort }]);
  });

  test('a union whose closest options fail differently reports no match', () => {
    const value = z.union([z.object({ name: z.string() }), z.object({ title: z.string() })]);
    const issues = issuesOf(z.object({ value }), { value: { name: 1 } });
    expect(fieldIssues(issues)).toStrictEqual([{ path: ['value'], message: message(ValidationMessage.NoMatch) }]);
  });

  test('splits unknown keys into one issue per key, pointing at the key', () => {
    const issues = issuesOf(z.object({ inner: strict }), { inner: { name: 'x', extra: 1, more: 2 } });
    expect(fieldIssues(issues)).toStrictEqual([
      { path: ['inner', 'extra'], message: unknownKey('extra') },
      { path: ['inner', 'more'], message: unknownKey('more') },
    ]);
  });
});

describe('en messages', () => {
  test('every problem and validation key has en text', () => {
    const keys = [...Object.values(ProblemMessage), ...Object.values(ValidationMessage)];
    expect(keys.filter((key) => !hasKey(key))).toStrictEqual([]);
  });
});
