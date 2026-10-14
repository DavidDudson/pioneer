import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, ContentRegistry, HitPoints, Selector } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { classPickerContent } from './class-options';

const ids = new ContentPackBuilder();
const pack = new ContentPackBuilder()
  .withClassFeature('wizard-spellcasting', {
    rules: [
      { key: 'SpellcastingEntry', slug: 'wizard', tradition: 'arcane', attribute: 'int', preparation: 'prepared' },
    ],
  })
  .withClassFeature('school-of-ars-grammatica', { tags: ['wizard-arcane-school'] })
  .withClass('wizard', ['int'], {
    hitPoints: 6,
    rules: [
      { key: 'Proficiency', selector: 'skill:arcana', rank: 'trained' },
      { key: 'Proficiency', selector: 'perception', rank: 'trained' },
      { key: 'Proficiency', selector: 'save:will', rank: 'expert', predicate: [{ gte: ['self:level', 5] }] },
      { key: 'GrantItem', item: ids.idOf(ContentKind.ClassFeature, 'wizard-spellcasting') },
    ],
  })
  .withClass('fighter', ['str', 'dex']);
const registry = new ContentRegistry();
registry.register(pack.build());
const content = classPickerContent(registry);

describe('classPickerContent', () => {
  test('lists every class by name with its hit points and key attributes', () => {
    expect(content.classes.map((each) => String(each.name))).toEqual(['Fighter', 'Wizard']);
    const fighter = content.classes.at(0);
    expect(fighter?.keyAttribute).toEqual(['str', 'dex']);
    expect(content.classes.at(1)?.hitPoints).toBe(HitPoints.parse(6));
  });

  test('splits the skills a class trains from its other starting ranks', () => {
    const wizard = content.classes.at(1);
    expect(wizard?.trained).toEqual([Selector.parse('skill:arcana')]);
    expect(wizard?.proficiencies.map((each) => String(each.selector))).toEqual(['perception']);
  });

  test('leaves out a rank a level gates', () => {
    const wizard = content.classes.at(1);
    expect(wizard?.proficiencies.some((each) => String(each.selector) === 'save:will')).toBe(false);
  });

  test('reads the tradition of the spellcasting a class grants', () => {
    expect(content.classes.at(1)?.traditions).toEqual(['arcane']);
    expect(content.classes.at(0)?.traditions).toEqual([]);
  });

  test('keeps every class feature, which is what a subclass is', () => {
    const school = content.features.get(
      ContentId.parse(pack.idOf(ContentKind.ClassFeature, 'school-of-ars-grammatica')),
    );
    expect(String(school?.name)).toBe('School-of-ars-grammatica');
  });

  test('reads the same content again for the same registry', () => {
    expect(classPickerContent(registry)).toBe(content);
  });
});
