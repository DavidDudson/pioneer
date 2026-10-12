import { describe, expect, test } from 'bun:test';

import { targetsOf } from './spell-targets';

describe('targetsOf', () => {
  test.each([
    ['1 creature', { any: [{ count: 1, of: 'creature' }] }],
    ['up to 5 creatures', { any: [{ count: 5, upTo: true, of: 'creature' }] }],
    ['one creature', { any: [{ count: 1, of: 'creature' }] }],
    ['1 willing living creature', { any: [{ count: 1, of: 'creature', qualifiers: ['willing', 'living'] }] }],
    [
      '1 creature or object',
      {
        any: [
          { count: 1, of: 'creature' },
          { count: 1, of: 'object' },
        ],
      },
    ],
    [
      '1 living creature or 1 willing undead creature',
      {
        any: [
          { count: 1, of: 'creature', qualifiers: ['living'] },
          { count: 1, of: 'creature', qualifiers: ['willing'], traits: ['undead'] },
        ],
      },
    ],
    [
      '1 spell effect or unattended magic item',
      {
        any: [
          { count: 1, of: 'spell-effect' },
          { count: 1, of: 'item', qualifiers: ['unattended', 'magical'] },
        ],
      },
    ],
    ['you and up to 4 allies', { any: [{ count: 4, upTo: true, of: 'ally' }], you: 'and' }],
    ['2 corpses', { any: [{ count: 2, of: 'corpse' }] }],
  ])('%p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    ['The triggering creature', { any: [{ count: 1, triggering: true, of: 'creature' }] }],
    [
      'the triggering creature or object',
      {
        any: [
          { count: 1, triggering: true, of: 'creature' },
          { count: 1, triggering: true, of: 'object' },
        ],
      },
    ],
    ['you and the triggering ally', { any: [{ count: 1, triggering: true, of: 'ally' }], you: 'and' }],
    ['you or the triggering ally', { any: [{ count: 1, triggering: true, of: 'ally' }], you: 'or' }],
  ])('the triggering one: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    ['your animal companion', { any: [{ count: 1, of: 'animal-companion' }] }],
    ['your familiar', { any: [{ count: 1, of: 'familiar' }] }],
    ['your eidolon', { any: [{ count: 1, of: 'eidolon' }] }],
    ['1 willing creature that is your companion', { any: [{ count: 1, of: 'companion', qualifiers: ['willing'] }] }],
  ])('a companion: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    ['any number of creatures', { any: [{ count: 'any', of: 'creature' }] }],
    ['any number of living creatures', { any: [{ count: 'any', of: 'creature', qualifiers: ['living'] }] }],
    ['1 or more creatures', { any: [{ count: 'any', of: 'creature' }] }],
    ['1 or any number of creatures', { any: [{ count: 'any', of: 'creature' }] }],
    [
      'you and any number of willing allies',
      { any: [{ count: 'any', of: 'ally', qualifiers: ['willing'] }], you: 'and' },
    ],
    ['1 to 3 willing creatures', { any: [{ count: 3, upTo: true, of: 'creature', qualifiers: ['willing'] }] }],
    ['1 or 2 creatures', { any: [{ count: 2, upTo: true, of: 'creature' }] }],
  ])('a count in words: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    ['all creatures in range', { any: [{ count: 'all', within: 'range', of: 'creature' }] }],
    ['enemies in the area', { any: [{ count: 'all', within: 'area', of: 'enemy' }] }],
    ['you and allies in the area', { any: [{ count: 'all', within: 'area', of: 'ally' }], you: 'and' }],
  ])('all of them in the area or range: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    ['you or 1 ally', { any: [{ count: 1, of: 'ally' }], you: 'or' }],
    ['1 ally and 1 enemy', { any: [{ count: 1, of: 'ally' }], plus: [{ count: 1, of: 'enemy' }] }],
    ['1 enemy', { any: [{ count: 1, of: 'enemy' }] }],
  ])('the caster instead, or a target as well: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    [
      '1 animal, beast, fey, fungus, or plant',
      {
        any: ['animal', 'beast', 'fey', 'fungus', 'plant'].map((trait) => ({
          count: 1,
          of: 'creature',
          traits: [trait],
        })),
      },
    ],
    ['1 extraplanar creature', { any: [{ count: 1, of: 'creature', traits: ['extraplanar'] }] }],
    ['1 dead creature', { any: [{ count: 1, of: 'creature', qualifiers: ['dead'] }] }],
    [
      '1 willing living animal',
      { any: [{ count: 1, of: 'creature', qualifiers: ['willing', 'living'], traits: ['animal'] }] },
    ],
    ['1 willing sleeping creature', { any: [{ count: 1, of: 'creature', qualifiers: ['willing', 'sleeping'] }] }],
    ['1 corporeal creature', { any: [{ count: 1, of: 'creature', qualifiers: ['corporeal'] }] }],
  ])('a creature by trait or state: %p', (text, expected) => {
    expect(targetsOf(text)).toEqual(expected);
  });

  test.each([
    '1 creature you know by name',
    '1 creature of a level no greater than double the geas ritual’s rank',
    '1 dead creature of 13th level or lower',
    '1 or 10 creatures',
    '1 creature, unattended object, or force construct',
    '1 creature or object tracked and up to 5 other willing creatures',
    'dead creatures and living creatures of your choice within range',
    'each ally targeted by the triggering spell',
    '1 creature in range',
  ])('%p does not map', (text) => {
    expect(targetsOf(text)).toBeUndefined();
  });
});
