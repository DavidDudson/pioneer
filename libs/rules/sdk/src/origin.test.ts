import { describe, expect, test } from 'bun:test';

import { fieldIssues, message, Temporal, ValidationMessage } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RulesMessage } from './messages';
import { Origin, OriginHopKind } from './origin';
import { SourceKind, SourceRef } from './source-ref';

function issues(schema: z.ZodType, value: unknown): readonly FieldIssue[] {
  const result = schema.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const FIGHTER = '1b7e0c1e-4a0f-5d6b-9c3a-2f1e8d7c6b5a';
const SHIELD_BLOCK = '5c2d9a7e-3b1f-5e8c-a4d6-7f0b1c2e3d4f';
const GM = '0f9e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f';
const AON_SHIELD_BLOCK = 'https://2e.aonprd.com/Feats.aspx?ID=4801';

/** Shield Block, granted by the Fighter class, with a GM's note: every hop kind in one wire value. */
const shieldBlockWire = {
  hops: [
    { kind: OriginHopKind.Choice, slot: 'class' },
    { kind: OriginHopKind.Grant, by: FIGHTER, rule: 3 },
    { kind: OriginHopKind.Inventory, item: GM, state: 'held' },
    { kind: OriginHopKind.Condition, condition: SHIELD_BLOCK, value: 2, appliedBy: GM },
    { kind: OriginHopKind.Effect, effect: SHIELD_BLOCK },
    { kind: OriginHopKind.Override, by: GM, at: '2026-10-09T10:00:00.000Z', note: 'House rule' },
    { kind: OriginHopKind.Variant, rule: FIGHTER },
  ],
  entry: SHIELD_BLOCK,
  sources: [{ kind: SourceKind.Book, book: 'player-core', page: 266, aon: AON_SHIELD_BLOCK }],
};

describe('SourceRef', () => {
  test.each([
    { kind: SourceKind.Book, book: 'player-core', page: 266 },
    { kind: SourceKind.Book, book: 'player-core', aon: AON_SHIELD_BLOCK },
    { kind: SourceKind.Web, url: 'https://example.com/brew', title: 'My brew' },
    { kind: SourceKind.Homebrew, author: GM, pack: 'my-pack' },
  ])('accepts %o', (source) => {
    const parsed: unknown = SourceRef.parse(source);
    expect(parsed).toStrictEqual(source);
  });

  test('a book source needs a page or an AoN link', () => {
    expect(issues(SourceRef, { kind: SourceKind.Book, book: 'player-core' })).toStrictEqual([
      { path: [], message: message(RulesMessage.BookLocation) },
    ]);
  });

  test.each([
    'https://2e.aonprd.com/Search.aspx?q=shield',
    'http://2e.aonprd.com/Feats.aspx?ID=4801',
    'https://aonprd.com/Feats.aspx?ID=4801',
    'https://2e.aonprd.com/Feats.aspx?ID=4801&evil=1',
  ])('rejects AoN link %s: it must be one entry on 2e.aonprd.com', (aon) => {
    expect(issues(SourceRef, { kind: SourceKind.Book, book: 'player-core', page: 1, aon })).toStrictEqual([
      { path: ['aon'], message: message(RulesMessage.AonUrl) },
    ]);
  });

  test('an unknown kind points at the kind', () => {
    expect(issues(SourceRef, { kind: 'scroll' })).toStrictEqual([
      { path: ['kind'], message: message(ValidationMessage.InvalidValue) },
    ]);
  });
});

describe('Origin', () => {
  test('decodes every hop kind, with the override time as an Instant', () => {
    const origin = Origin.parse(shieldBlockWire);
    const override = origin.hops.find((hop) => hop.kind === OriginHopKind.Override);
    expect(override?.at).toBeInstanceOf(Temporal.Instant);
  });

  test('encodes back to the same wire value', () => {
    const encoded: unknown = z.encode(Origin, Origin.parse(shieldBlockWire));
    expect(encoded).toStrictEqual(shieldBlockWire);
  });

  test('needs at least one source (ADR-0005)', () => {
    expect(issues(Origin, { ...shieldBlockWire, sources: [] })).toStrictEqual([
      { path: ['sources'], message: message(ValidationMessage.TooSmall, { origin: 'array', minimum: 1 }) },
    ]);
  });

  test('points at an unknown field inside a hop', () => {
    const wire = { ...shieldBlockWire, hops: [{ kind: OriginHopKind.Choice, slot: 'class', why: 'x' }] };
    expect(issues(Origin, wire)).toStrictEqual([
      { path: ['hops', 0, 'why'], message: message(ValidationMessage.UnrecognizedKeys, { count: 1, keys: 'why' }) },
    ]);
  });
});
