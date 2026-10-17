import { KeyPropertyRune, ReviewedName, ReviewedRuneId } from '@pioneer/campaign/domain';
import { describe, expect, it } from 'vitest';

import { runeLines } from '../home/campaign-key-item-row/campaign-key-item-row.component';
import { EMPTY_KEY_ITEM, KeyItemForm, toCreateBody } from './key-item-form';

const longsword = ReviewedRuneId.parse('2b3c4d5e-6f70-4a81-92b3-c4d5e6f70819');
const base = { item: longsword, name: ReviewedName.parse('Longsword') };
const flaming = KeyPropertyRune.parse({ rune: '3c4d5e6f-7081-4b92-a3c4-d5e6f7081920', name: 'Flaming' });

describe('the key item form', () => {
  it('refuses an empty form: a name and a base item are needed', () => {
    expect(KeyItemForm.safeParse(EMPTY_KEY_ITEM).success).toBe(false);
  });

  it('accepts a name, a base item and no runes', () => {
    const model = { ...EMPTY_KEY_ITEM, name: 'Caliburn', base: longsword };
    expect(KeyItemForm.safeParse(model).success).toBe(true);
  });

  it('refuses a grade the rules do not have', () => {
    const model = { ...EMPTY_KEY_ITEM, name: 'Caliburn', base: longsword, potency: '5' };
    expect(KeyItemForm.safeParse(model).success).toBe(false);
  });

  it('states the runes the GM picked, grades as numbers and property runes as given', () => {
    const model = {
      ...EMPTY_KEY_ITEM,
      name: 'Caliburn',
      base: longsword,
      potency: '3' as const,
      reinforcing: '6' as const,
    };

    const body = toCreateBody(model, base, [flaming]);

    expect(body.runes).toMatchObject({ potency: 3, reinforcing: 6, property: [flaming] });
    expect(body.runes.striking).toBeUndefined();
    expect(body.base).toStrictEqual(base);
  });

  it('leaves a rune with no grade out, and keeps more property runes than the table allows', () => {
    const many = Array.from({ length: 6 }, () => flaming);
    const model = { ...EMPTY_KEY_ITEM, name: 'Caliburn', base: longsword };

    const body = toCreateBody(model, base, many);

    expect(body.runes.potency).toBeUndefined();
    expect(body.runes.property).toHaveLength(6);
  });
});

describe('the lines a key item’s runes read as', () => {
  it('says each grade stated, then the property runes by name', () => {
    const body = toCreateBody({ ...EMPTY_KEY_ITEM, name: 'Caliburn', base: longsword, potency: '3' }, base, [flaming]);

    expect(runeLines(body.runes).map(({ key }) => key)).toStrictEqual([
      'campaign.keyItems.rune.potency',
      'campaign.keyItems.rune.property',
    ]);
  });

  it('says nothing for a key item with no runes', () => {
    const body = toCreateBody({ ...EMPTY_KEY_ITEM, name: 'Caliburn', base: longsword }, base, []);

    expect(runeLines(body.runes)).toStrictEqual([]);
  });
});
