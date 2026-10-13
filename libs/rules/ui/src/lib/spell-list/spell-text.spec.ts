import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { SpellData } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { DISPEL_MAGIC, FIREBALL, HEAL, INVISIBILITY, lineOf } from '../testing/spell-fixtures';
import type { Translate } from './spell-text';
import { areaText, defenceText, durationText, rangeText, targetsText } from './spell-text';

function translator(): Translate {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const transloco = TestBed.inject(TranslocoService);
  return (key, params) => transloco.translate(key, params);
}

/** A 1st-rank spell with `fields` over a two-action cast, to read one field of. */
function spellWith(fields: object): SpellData {
  return SpellData.parse({
    rank: 1,
    time: { type: 'actions', cost: 'two' },
    traditions: ['arcane'],
    damage: [],
    ...fields,
  });
}

describe('spell fields as text', () => {
  it('words range and area from the structured fields', () => {
    const translate = translator();
    const either = spellWith({ range: { type: 'either', options: [{ type: 'touch' }, { type: 'feet', feet: 30 }] } });
    const line = spellWith({ area: { shape: 'line', size: 60, width: 10 } });

    expect(rangeText(FIREBALL.range, translate)).toBe('500 feet');
    expect(rangeText(either.range, translate)).toBe('touch or 30 feet');
    expect(areaText(FIREBALL.area, translate)).toBe('20-foot burst');
    expect(areaText(line.area, translate)).toBe('60-foot line, 10 feet wide');
    expect(rangeText(undefined, translate)).toBeUndefined();
  });

  it('words targets with counts, qualifiers, kinds and the caster', () => {
    const translate = translator();
    const every = spellWith({ targets: { any: [{ count: 'all', within: 'area', of: 'enemy' }] } });
    const upTo = spellWith({ targets: { any: [{ count: 5, upTo: true, of: 'ally' }] } });

    expect(targetsText(HEAL.targets, translate)).toBe('you or 1 willing creature');
    expect(targetsText(DISPEL_MAGIC.targets, translate)).toBe('1 creature or 1 object');
    expect(targetsText(every.targets, translate)).toBe('all enemies in the area');
    expect(targetsText(upTo.targets, translate)).toBe('up to 5 allies');
  });

  it('words defence as a save, a basic save, AC or a DC', () => {
    const translate = translator();
    const armor = spellWith({ defense: { against: 'ac' } });
    const dc = spellWith({ defense: { against: 'save:will' } });

    expect(defenceText(FIREBALL.defense, translate)).toBe('basic Reflex');
    expect(defenceText(armor.defense, translate)).toBe('AC');
    expect(defenceText(dc.defense, translate)).toBe('Will DC');
  });

  it('words durations, none for an instant spell', () => {
    const translate = translator();
    const sustained = spellWith({ duration: { type: 'time', count: 1, unit: 'minute', sustained: true } });
    const turn = spellWith({ duration: { type: 'until', until: 'turn-end' } });

    expect(durationText(INVISIBILITY.duration, translate)).toBe('10 minutes');
    expect(durationText(sustained.duration, translate)).toBe('sustained up to 1 minute');
    expect(durationText(turn.duration, translate)).toBe('until the end of your turn');
    expect(durationText(undefined, translate)).toBeUndefined();
  });

  it('words damage at the cast rank, and healing apart from damage', () => {
    const translate = translator();
    const damage = (rank: number): string[] =>
      lineOf({ slug: 'fireball', name: 'Fireball', data: FIREBALL, rank }, translate).effects.map(({ text }) => text);

    expect(damage(3)).toStrictEqual(['6d6 fire']);
    expect(damage(5)).toStrictEqual(['10d6 fire']);
    expect(
      lineOf({ slug: 'heal', name: 'Heal', data: HEAL, rank: 2 }, translate).effects.map(({ text }) => text),
    ).toStrictEqual(['2d8 damage or healing']);
  });
});
