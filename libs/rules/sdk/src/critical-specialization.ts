import type { RichText } from './rich-text';
import { BlockKind, InlineKind, RichTextString, TextMark } from './rich-text';
import { WeaponGroup } from './weapon';

/** What a weapon group does on a critical hit, as the Remaster rules word it (Archives of Nethys, weapon groups). */
const EFFECTS: Readonly<Record<WeaponGroup, string>> = {
  [WeaponGroup.Axe]:
    "Choose one creature adjacent to the initial target and within reach. If its AC is lower than your attack roll result for the critical hit, you deal damage to that creature equal to the result of the weapon damage die you rolled (including extra dice for its striking rune, if any). This amount isn't doubled, and no bonuses or other additional dice apply to this damage.",
  [WeaponGroup.Bomb]: "Increase the radius of the bomb's splash damage (if any) to 10 feet.",
  [WeaponGroup.Bow]:
    "If the target of the critical hit is adjacent to a surface, it gets stuck to that surface by the missile. The target is immobilized and must spend an Interact action to attempt a DC 10 Athletics check to pull the missile free; it can't move from its space until it succeeds. The creature doesn't become stuck if it is incorporeal, is liquid (like a water elemental or some oozes), or could otherwise escape without effort.",
  [WeaponGroup.Brawling]:
    'The target must succeed at a Fortitude save against your class DC or be slowed 1 until the end of your next turn.',
  [WeaponGroup.Club]:
    'You knock the target away from you up to 10 feet (you choose the distance). This is forced movement.',
  [WeaponGroup.Crossbow]:
    "The target takes 1d8 persistent bleed damage. You gain an item bonus to this bleed damage equal to the weapon's item bonus to attack rolls.",
  [WeaponGroup.Dart]:
    "The target takes 1d6 persistent bleed damage. You gain an item bonus to this bleed damage equal to the weapon's item bonus to attack rolls.",
  [WeaponGroup.Firearm]: 'The target must succeed at a Fortitude save against your class DC or be stunned 1.',
  [WeaponGroup.Flail]: 'The target is knocked prone unless they succeed at a Reflex save against your class DC.',
  [WeaponGroup.Hammer]: 'The target is knocked prone unless they succeed at a Fortitude save against your class DC.',
  [WeaponGroup.Knife]:
    "The target takes 1d6 persistent bleed damage. You gain an item bonus to this bleed damage equal to the weapon's item bonus to attack rolls.",
  [WeaponGroup.Pick]: 'The weapon viciously pierces the target, who takes 2 additional damage per weapon damage die.',
  [WeaponGroup.Polearm]: 'The target is moved 5 feet in a direction of your choice. This is forced movement.',
  [WeaponGroup.Shield]: 'You knock the target back from you 5 feet. This is forced movement.',
  [WeaponGroup.Sling]: 'The target must succeed at a Fortitude save against your class DC or be stunned 1.',
  [WeaponGroup.Spear]:
    'The weapon pierces the target, weakening its attacks. The target is clumsy 1 until the start of your next turn.',
  [WeaponGroup.Sword]:
    'The target is made off-balance by your attack, becoming off-guard until the start of your next turn.',
};

/** The effect of a weapon group's critical specialization, headed by the group's name, as a note's text. */
export function criticalSpecializationOf(group: WeaponGroup): RichText {
  return [
    {
      type: BlockKind.Paragraph,
      content: [
        {
          type: InlineKind.Text,
          text: RichTextString.parse(`Critical specialization (${group}).`),
          marks: [TextMark.Strong],
        },
        { type: InlineKind.Text, text: RichTextString.parse(` ${EFFECTS[group]}`) },
      ],
    },
  ];
}

/**
 * The additional benefit a grievous rune gives a weapon group's critical specialization (Archives of Nethys, Grievous).
 * A bomb has none.
 */
const GRIEVOUS_EFFECTS: Readonly<Partial<Record<WeaponGroup, string>>> = {
  [WeaponGroup.Axe]: 'You can damage a third creature, with the same restrictions.',
  [WeaponGroup.Bow]: 'The Athletics check to pull the missile free is DC 20.',
  [WeaponGroup.Brawling]: 'The target takes a -4 circumstance penalty to its save.',
  [WeaponGroup.Club]: 'You can knock the target up to 15 feet away.',
  [WeaponGroup.Crossbow]:
    'If the target of the critical hit is adjacent to a surface, it gets stuck to that surface by the missile, as the bow critical specialization.',
  [WeaponGroup.Dart]: 'The base persistent bleed damage increases to 2d6.',
  [WeaponGroup.Firearm]: 'The target takes a -4 circumstance penalty to its save.',
  [WeaponGroup.Flail]:
    "You move the target 5 feet. You can't move it away from you, but you can move it in another direction of your choice.",
  [WeaponGroup.Hammer]: 'You can also knock the target 5 feet away from you.',
  [WeaponGroup.Knife]:
    'The target takes a -5-foot status penalty to its Speed while it has the persistent bleed damage.',
  [WeaponGroup.Pick]: 'The extra damage from the critical specialization effect increases to 4 per weapon damage die.',
  [WeaponGroup.Polearm]: 'You can move the target up to 10 feet.',
  [WeaponGroup.Shield]: 'You can knock the target up to 10 feet away.',
  [WeaponGroup.Sling]: 'The target also takes a -10-foot status penalty to its Speed for 1 round if it fails the save.',
  [WeaponGroup.Spear]: 'The clumsy condition lasts for 2 rounds.',
  [WeaponGroup.Sword]: 'The target is off-guard until the end of your next turn.',
};

/** What a grievous rune adds to a weapon group's critical specialization, headed by the group's name, as a note's text; undefined for a group with none. */
export function grievousSpecializationOf(group: WeaponGroup): RichText | undefined {
  const effect = GRIEVOUS_EFFECTS[group];
  return effect === undefined
    ? undefined
    : [
        {
          type: BlockKind.Paragraph,
          content: [
            {
              type: InlineKind.Text,
              text: RichTextString.parse(`Grievous (${group}).`),
              marks: [TextMark.Strong],
            },
            { type: InlineKind.Text, text: RichTextString.parse(` ${effect}`) },
          ],
        },
      ];
}
