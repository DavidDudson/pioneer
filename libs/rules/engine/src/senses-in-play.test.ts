import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentId, RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { sensesInPlay } from './senses-in-play';
import type { AncestryVision, SenseInPlay } from './senses-in-play';
import { inPlay } from './testing';

const DARKVISION = ContentId.parse('67979b6a-4b24-5be5-b7ea-94783c497bcb');
const SCENT = ContentId.parse('279973df-e7b9-5fa1-9bb6-1cfdc54b82b6');
const TREMORSENSE = ContentId.parse('367b9fa7-8944-5208-9949-9457984b7c59');

const sense = (id: ContentId, extra: object = {}): object => ({ key: 'Sense', sense: id, ...extra });

/** Each sense as `[id, acuity, range]`, with `unlimited` for no range. */
type Row = readonly [ContentId, string, number | 'unlimited'];

interface Situation {
  readonly options?: readonly string[];
  readonly vision?: AncestryVision;
}

function sensesOf(
  placed: readonly (readonly [object, string])[],
  { options = [], vision }: Situation = {},
): SenseInPlay[] {
  const rules = placed.map(([element, on], rule) => inPlay(element, on, { rule }));
  const facts = new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    CORE_NAMESPACES,
  );
  return [...sensesInPlay({ rules, facts }, vision)];
}

function rowsOf(placed: readonly (readonly [object, string])[], situation: Situation = {}): Row[] {
  const senses = sensesOf(placed, situation);
  return senses.map(({ sense: id, acuity, range }): Row => [id, acuity, range ?? 'unlimited']);
}

describe('sensesInPlay', () => {
  test('a Sense element gives its sense with its acuity and range, and its origin', () => {
    const placed = [[sense(SCENT, { acuity: 'imprecise', range: 30 }), 'sensate-gnome']] as const;
    const { origin } = inPlay(sense(SCENT), 'sensate-gnome');

    expect(rowsOf(placed)).toEqual([[SCENT, 'imprecise', 30]]);
    expect(sensesOf(placed)[0]?.origins).toEqual([origin]);
  });

  test('without an acuity a sense is precise, and without a range unlimited', () => {
    const rows = rowsOf([[sense(DARKVISION), 'cavern-elf']]);

    expect(rows).toEqual([[DARKVISION, 'precise', 'unlimited']]);
  });

  test("the ancestry's vision is precise and unlimited, and is one sense with a Sense that reads alike", () => {
    const vision = { sense: DARKVISION, origin: inPlay(sense(DARKVISION), 'dwarf').origin };
    const senses = sensesOf([[sense(DARKVISION), 'darkvision']], { vision });
    const darkvision = inPlay(sense(DARKVISION), 'darkvision').origin;

    expect(senses.map(({ acuity, range }) => [acuity, range])).toEqual([['precise', undefined]]);
    expect(senses[0]?.origins).toEqual([vision.origin, darkvision]);
  });

  test('a grant another beats on acuity or range, and matches on the other, is dropped', () => {
    const rows = rowsOf([
      [sense(TREMORSENSE, { acuity: 'imprecise', range: 20 }), 'echoes-in-stone'],
      [sense(TREMORSENSE, { acuity: 'imprecise', range: 60 }), 'familiar-of-keen-senses'],
      [sense(TREMORSENSE, { acuity: 'vague', range: 60 }), 'shifting-form'],
    ]);

    expect(rows).toEqual([[TREMORSENSE, 'imprecise', 60]]);
  });

  test('grants neither beats both remain, the more acute first', () => {
    const rows = rowsOf([
      [sense(SCENT, { acuity: 'vague' }), 'shifting-form'],
      [sense(SCENT, { acuity: 'imprecise', range: 30 }), 'sensate-gnome'],
    ]);

    expect(rows).toEqual([
      [SCENT, 'imprecise', 30],
      [SCENT, 'vague', 'unlimited'],
    ]);
  });

  test('a Sense whose predicate fails or depends on the situation gives none', () => {
    const rows = rowsOf(
      [
        [sense(SCENT, { predicate: ['familiar-of-keen-senses:scent'] }), 'familiar-of-keen-senses'],
        [sense(DARKVISION, { predicate: ['terrain:underground'] }), 'shifting-form'],
        [sense(TREMORSENSE, { predicate: ['familiar-of-keen-senses:tremorsense'] }), 'familiar-of-keen-senses'],
      ],
      { options: ['familiar-of-keen-senses:tremorsense'] },
    );

    expect(rows).toEqual([[TREMORSENSE, 'precise', 'unlimited']]);
  });

  test('senses come in order of id, and other rule elements give none', () => {
    const senses = sensesOf([
      [sense(TREMORSENSE), 'a'],
      [{ key: 'Immunity', type: ['blinded'] }, 'b'],
      [sense(DARKVISION), 'c'],
      [sense(SCENT), 'd'],
    ]);

    expect(senses.map(({ sense: id }) => id)).toEqual([SCENT, TREMORSENSE, DARKVISION]);
  });
});
