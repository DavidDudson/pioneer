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

function rowsOf(senses: readonly SenseInPlay[]): Row[] {
  return senses.map(({ sense: id, acuity, range }): Row => [id, acuity, range ?? 'unlimited']);
}

function sensesOf(
  placed: readonly (readonly [object, string])[],
  { options = [], vision }: { options?: readonly string[]; vision?: AncestryVision } = {},
): readonly SenseInPlay[] {
  const rules = placed.map(([element, on], rule) => inPlay(element, on, { rule }));
  const facts = new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    CORE_NAMESPACES,
  );
  return sensesInPlay({ rules, facts }, vision);
}

describe('sensesInPlay', () => {
  test('a Sense element gives its sense with its acuity and range, and its origin', () => {
    const senses = sensesOf([[sense(SCENT, { acuity: 'imprecise', range: 30 }), 'sensate-gnome']]);

    expect(rowsOf(senses)).toEqual([[SCENT, 'imprecise', 30]]);
    expect(senses[0]?.origins).toEqual([inPlay(sense(SCENT), 'sensate-gnome').origin]);
  });

  test('without an acuity a sense is precise, and without a range unlimited', () => {
    expect(rowsOf(sensesOf([[sense(DARKVISION), 'cavern-elf']]))).toEqual([[DARKVISION, 'precise', 'unlimited']]);
  });

  test("the ancestry's vision is precise and unlimited, and merges with a Sense of the same sense", () => {
    const vision = { sense: DARKVISION, origin: inPlay(sense(DARKVISION), 'dwarf').origin };
    const senses = sensesOf([[sense(DARKVISION), 'darkvision']], { vision });

    expect(rowsOf(senses)).toEqual([[DARKVISION, 'precise', 'unlimited']]);
    expect(senses[0]?.origins).toEqual([vision.origin, inPlay(sense(DARKVISION), 'darkvision').origin]);
  });

  test('two grants of one sense keep the better acuity and the longer range, each on its own', () => {
    const senses = sensesOf([
      [sense(TREMORSENSE, { acuity: 'vague', range: 60 }), 'echoes-in-stone'],
      [sense(TREMORSENSE, { acuity: 'imprecise', range: 20 }), 'familiar-of-keen-senses'],
    ]);

    expect(rowsOf(senses)).toEqual([[TREMORSENSE, 'imprecise', 60]]);
    expect(senses[0]?.origins).toHaveLength(2);
  });

  test('a grant with no range makes the sense unlimited', () => {
    const senses = sensesOf([
      [sense(SCENT, { acuity: 'imprecise', range: 30 }), 'sensate-gnome'],
      [sense(SCENT, { acuity: 'vague' }), 'shifting-form'],
    ]);

    expect(rowsOf(senses)).toEqual([[SCENT, 'imprecise', 'unlimited']]);
  });

  test('a Sense whose predicate fails or depends on the situation gives none', () => {
    const senses = sensesOf(
      [
        [sense(SCENT, { predicate: ['familiar-of-keen-senses:scent'] }), 'familiar-of-keen-senses'],
        [sense(DARKVISION, { predicate: ['terrain:underground'] }), 'shifting-form'],
        [sense(TREMORSENSE, { predicate: ['familiar-of-keen-senses:tremorsense'] }), 'familiar-of-keen-senses'],
      ],
      { options: ['familiar-of-keen-senses:tremorsense'] },
    );

    expect(rowsOf(senses)).toEqual([[TREMORSENSE, 'precise', 'unlimited']]);
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
