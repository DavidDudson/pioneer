import { BACKGROUND_SLOT, CLASS_SLOT, HERITAGE_SLOT } from '@pioneer/character/domain';
import { contentId, EntrySlug, PackId, SlotKey } from '@pioneer/rules/sdk';
import { Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { draftCharacter, draftOf, draftPicks, validName } from './creation-draft';
import type { CreationDraft } from './creation-draft';

const elf = contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf'));
const fighter = contentId(PackId.parse('player-core'), EntrySlug.parse('class:fighter'));
const EMPTY: CreationDraft = draftOf(() => undefined);

describe('a draft read from the URL', () => {
  it('has the parts the URL holds', () => {
    const params = new Map([['name', 'Merisiel']]);
    expect(draftOf((field) => params.get(field))).toStrictEqual({ ...EMPTY, name: 'Merisiel' });
  });

  it('has every other part empty', () => {
    expect(EMPTY.ancestry).toBe('');
  });
});

describe('the name of a draft', () => {
  it('is refused when empty', () => {
    expect(validName('')).toBe(false);
  });

  it('is taken when it is a name', () => {
    expect(validName('Merisiel')).toBe(true);
  });
});

describe('the picks of a draft', () => {
  it('come in the order a character needs them, leaving out what is empty', () => {
    const subclass = SlotKey.parse('class-subclass');
    const picks = draftPicks({ ...EMPTY, class: fighter, subclass: fighter, heritage: elf }, subclass);
    expect(picks.map(([slot]) => slot)).toStrictEqual([HERITAGE_SLOT, CLASS_SLOT, subclass]);
  });

  it('leave out a background that is not chosen', () => {
    const picks = draftPicks({ ...EMPTY, class: fighter }, undefined);
    expect(picks.map(([slot]) => slot)).not.toContain(BACKGROUND_SLOT);
  });

  it('leave out a subclass when the class has no such slot', () => {
    const picks = draftPicks({ ...EMPTY, class: fighter, subclass: fighter }, undefined);
    expect(picks.map(([slot]) => slot)).toStrictEqual([CLASS_SLOT]);
  });
});

describe('the character a draft would make', () => {
  const now = Temporal.Now.instant();

  it('is none until an ancestry is chosen', () => {
    expect(draftCharacter(EMPTY, now)).toBeUndefined();
  });

  it('holds the ancestry', () => {
    expect(draftCharacter({ ...EMPTY, ancestry: elf }, now)?.ancestry).toBe(elf);
  });

  it('holds the picks made so far', () => {
    const character = draftCharacter({ ...EMPTY, ancestry: elf, class: fighter }, now);
    expect(character?.document.build.choices[CLASS_SLOT]).toBe(fighter);
  });
});
