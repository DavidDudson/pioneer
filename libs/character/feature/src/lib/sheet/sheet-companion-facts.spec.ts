import { deriveCompanionStatistics } from '@pioneer/rules/engine';
import { CompanionStatBlock, Level, Modifier, Proficiency } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { companionFacts } from './sheet-companion-facts';

const block = CompanionStatBlock.parse({
  size: 'small',
  attributes: { str: 3, dex: 2, con: 2, int: -4, wis: 1, cha: 0 },
  ancestryHp: 8,
  extraSkill: 'survival',
  speed: 35,
  movement: { fly: 60 },
  senses: ['low-light vision', 'scent (imprecise, 30 feet)'],
  special: ['mount'],
  attacks: [{ slug: 'jaws', attribute: 'str', damage: { dice: 1, die: 'd8', damageType: 'piercing' } }],
});

const statistics = deriveCompanionStatistics({
  level: Level.parse(2),
  block,
  tiers: new Set(),
  proficiencyBonus: (rank) => Modifier.parse(rank === Proficiency.Untrained ? 0 : 2 + 2),
});

/** Echoes the key and what it interpolates, so the spec reads the lines without a bundle. */
const echo = (key: string, params: Readonly<Record<string, string | number>> = {}): string =>
  `${key.split('.').at(-1)}${Object.values(params)
    .map((value) => ` ${value}`)
    .join('')}`;

describe(companionFacts, () => {
  const facts = companionFacts('Bear', statistics, echo);

  it('names the species, size and Hit Points first', () => {
    expect(facts.slice(0, 3).map(({ text }) => text)).toStrictEqual(['species Bear', 'size small', 'hitPoints 24']);
  });

  it('lists the movement a species has beyond walking', () => {
    expect(facts.find(({ key }) => key.endsWith('movement'))?.text).toBe('movement fly 60');
  });

  it('lists senses and special rules', () => {
    expect(facts.find(({ key }) => key.endsWith('senses'))?.text).toBe(
      'senses low-light vision, scent (imprecise, 30 feet)',
    );
    expect(facts.some(({ text }) => text === 'special mount')).toBe(true);
  });

  it('shows a strike per attack, with its damage type', () => {
    expect(facts.at(-1)?.text).toContain('piercing');
  });
});
