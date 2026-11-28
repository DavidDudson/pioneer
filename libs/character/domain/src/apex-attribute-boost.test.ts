import { describe, expect, test } from 'bun:test';

import { AncestryId, Attribute, AttributeModifier, ContentRegistry, VariantStructure } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { attributeModifiers, boostSlots, BoostSource } from './attribute-boosts';
import type { BoostContent } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { BACKGROUND_SLOT, CLASS_SLOT } from './character-slots';
import { slotContent } from './slot-offer';
import { BOOST_FIXTURES, boostFixtureId, CharacterBuilder } from './testing';

const APEX: BoostContent = { ...BOOST_FIXTURES, apex: true };

/** The modifier an apex increase lifts an attribute to: one more, or +4 when that is higher (GM Core). */
const APEX_MODIFIER = 4;

/** A fighter of `level`, with the apex slot picked when `apex` names an attribute. */
function fighter(level: number, apex?: Attribute): CharacterDocument {
  const builder = new CharacterBuilder()
    .withAncestry(AncestryId.parse(boostFixtureId('ancestry:dwarf')))
    .atLevel(level)
    .picking(BACKGROUND_SLOT, boostFixtureId('background:farmhand'))
    .picking(CLASS_SLOT, boostFixtureId('class:fighter'));

  if (apex !== undefined) {
    builder.picking('boost:17:apex:0', apex);
  }

  return builder.build().document;
}

/** The apex slots of a level 17 fighter under `content`, as `key@level`. */
function apexKeys(content: BoostContent): Array<string> {
  return boostSlots(fighter(17), content)
    .filter((slot) => slot.source === BoostSource.Apex)
    .map((slot) => `${slot.key}@${slot.level}`);
}

describe('the apex attribute increase', () => {
  test('is one slot at 17th level, only while the content has it', () => {
    expect(apexKeys(APEX)).toStrictEqual(['boost:17:apex:0@17']);
    expect(apexKeys(BOOST_FIXTURES)).toStrictEqual([]);
  });

  test.each(Object.values(Attribute))('raises %s by one, or to +4 when that is higher', (attribute) => {
    const before = attributeModifiers(fighter(17), APEX).toWire()[attribute];
    const after = attributeModifiers(fighter(17, attribute), APEX).toWire()[attribute];

    expect(after).toBe(AttributeModifier.parse(Math.max(before + 1, APEX_MODIFIER)));
  });

  test('changes only the attribute it is placed on', () => {
    const before = attributeModifiers(fighter(17), APEX).toWire();
    const after = attributeModifiers(fighter(17, Attribute.Intelligence), APEX).toWire();

    expect({ ...after, int: before.int }).toStrictEqual(before);
  });

  test('does not count before 17th level, which is the plan', () => {
    expect(attributeModifiers(fighter(16, Attribute.Strength), APEX).toWire()).toStrictEqual(
      attributeModifiers(fighter(16), APEX).toWire(),
    );
  });

  test('does nothing while the content has no apex increase', () => {
    expect(attributeModifiers(fighter(17, Attribute.Strength), BOOST_FIXTURES).toWire()).toStrictEqual(
      attributeModifiers(fighter(17), BOOST_FIXTURES).toWire(),
    );
  });
});

describe('a variant rule with the apex boost structure', () => {
  const pack = new ContentPackBuilder()
    .withId('variants')
    .withVariantRule('apex', [VariantStructure.ApexBoost])
    .build();

  const registry = new ContentRegistry();
  registry.register(pack);
  const [variant] = registry.variantRules();

  test('turns the apex increase on in the slot content, and nothing else does', () => {
    expect(slotContent(registry, variant === undefined ? [] : [variant]).boosts.apex).toBe(true);
    expect(slotContent(registry).boosts.apex).toBe(false);
  });
});
