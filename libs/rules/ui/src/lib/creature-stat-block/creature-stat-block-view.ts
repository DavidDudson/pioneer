import { CreatureRole, DamageTypeSchema, InlineKind } from '@pioneer/rules/sdk';
import type { CreatureSense, CreatureSkill, DamageAdjustment, Immunity, Slug } from '@pioneer/rules/sdk';

import { ATTRIBUTE_MESSAGES } from '../attributes/attributes-messages';
import { SIGNED } from '../breakdown/number-style';
import { SIZE_MESSAGES } from '../build-summary/build-summary-messages';
import { DAMAGE_TYPE_MESSAGES } from '../rich-text/rich-text-messages';
import type { ItemLine, StatBlockCreature, StatBlockView, StatLine } from './creature-stat-block';
import { abilityLine, spellcastingLine, strikeLine } from './creature-stat-block-actions';
import { ACUITY_MESSAGES, CreatureStatBlockMessage, MOVEMENT_MESSAGES } from './creature-stat-block-messages';
import type { StatBlockWords } from './stat-block-words';

const ATTRIBUTE_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const SAVE_ORDER = ['fortitude', 'reflex', 'will'] as const;
const SAVE_INITIALS: Readonly<Record<(typeof SAVE_ORDER)[number], string>> = {
  fortitude: 'Fort',
  reflex: 'Ref',
  will: 'Will',
};

/** "warfare-lore" reads "Warfare Lore": content names skills, languages and senses by slug only. */
function slugLabel(slug: Slug | Immunity): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** The stat block of `creature`, worded: parts the creature lacks are left empty. */
export function statBlockView(creature: StatBlockCreature, words: StatBlockWords): StatBlockView {
  const { data } = creature;
  const level = words.translate(
    data.role === CreatureRole.Npc ? CreatureStatBlockMessage.NpcLevel : CreatureStatBlockMessage.Level,
    { level: words.number(creature.level) },
  );
  return {
    level,
    traits: [words.translate(SIZE_MESSAGES[data.size]), ...creature.traits],
    senses: perception(creature, words),
    details: details(creature, words),
    defences: [...defences(creature, words), speeds(creature, words)],
    strikes: (data.strikes ?? []).map((strike) => strikeLine(strike, words)),
    abilities: (data.abilities ?? []).map((ability) => abilityLine(ability, words)),
    spellcasting: (data.spellcasting ?? []).map((entry) => spellcastingLine(entry, words)),
    items: (data.items ?? []).map((item): ItemLine => ({
      ref: { type: InlineKind.Ref, id: item.item },
      quantity:
        item.quantity === undefined
          ? undefined
          : words.translate(CreatureStatBlockMessage.ItemQuantity, { quantity: words.number(item.quantity) }),
    })),
    recallKnowledge:
      data.recallKnowledge === undefined
        ? []
        : [{ label: words.translate(CreatureStatBlockMessage.RecallKnowledge), text: data.recallKnowledge }],
  };
}

function senseText(sense: CreatureSense, words: StatBlockWords): string {
  const acuity = sense.acuity === undefined ? '' : ` (${words.translate(ACUITY_MESSAGES[sense.acuity])})`;
  const range = sense.range === undefined ? '' : ` ${words.distance(sense.range)}`;
  return `${slugLabel(sense.sense)}${acuity}${range}`;
}

/** "Perception +7; darkvision 60 feet". */
function perception({ data }: StatBlockCreature, words: StatBlockWords): readonly StatLine[] {
  const held = (data.senses ?? []).map((sense) => senseText(sense, words));
  const value = words.number(data.perception, SIGNED);
  return [
    {
      label: words.translate(CreatureStatBlockMessage.Perception),
      text: held.length === 0 ? value : `${value}; ${words.list(held, 'unit')}`,
    },
  ];
}

function skillText(skill: CreatureSkill, words: StatBlockWords): string {
  return words.translate(CreatureStatBlockMessage.Skill, {
    skill: slugLabel(skill.skill),
    modifier: words.number(skill.modifier, SIGNED),
  });
}

function details({ data }: StatBlockCreature, words: StatBlockWords): readonly StatLine[] {
  const shown: StatLine[] = [];
  if (data.languages !== undefined && data.languages.length > 0) {
    shown.push({
      label: words.translate(CreatureStatBlockMessage.Languages),
      text: words.list(data.languages.map(slugLabel), 'unit'),
    });
  }
  if (data.skills !== undefined && data.skills.length > 0) {
    shown.push({
      label: words.translate(CreatureStatBlockMessage.Skills),
      text: words.list(
        data.skills.map((skill) => skillText(skill, words)),
        'unit',
      ),
    });
  }
  shown.push({
    label: words.translate(CreatureStatBlockMessage.Attributes),
    text: words.list(
      ATTRIBUTE_ORDER.map(
        (attribute) =>
          `${words.translate(ATTRIBUTE_MESSAGES[attribute])} ${words.number(data.attributes[attribute], SIGNED)}`,
      ),
      'unit',
    ),
  });
  return shown;
}

function adjustmentText({ type, value, exceptions }: DamageAdjustment, words: StatBlockWords): string {
  const damageType = DamageTypeSchema.safeParse(type);
  const target = damageType.success ? words.translate(DAMAGE_TYPE_MESSAGES[damageType.data]) : type;
  return words.translate(CreatureStatBlockMessage.Adjustment, {
    target,
    value: words.number(value),
    hasExceptions: exceptions === undefined || exceptions.length === 0 ? 'no' : 'yes',
    exceptions: words.list(exceptions ?? [], 'disjunction'),
  });
}

function defences({ data }: StatBlockCreature, words: StatBlockWords): readonly StatLine[] {
  const shown: StatLine[] = [
    { label: words.translate(CreatureStatBlockMessage.ArmorClass), text: words.number(data.armorClass) },
    {
      label: words.translate(CreatureStatBlockMessage.Saves),
      text: words.list(
        SAVE_ORDER.map((save) => `${SAVE_INITIALS[save]} ${words.number(data.saves[save], SIGNED)}`),
        'unit',
      ),
    },
    { label: words.translate(CreatureStatBlockMessage.HitPoints), text: words.number(data.hitPoints) },
  ];
  if (data.immunities.length > 0) {
    shown.push({
      label: words.translate(CreatureStatBlockMessage.Immunities),
      text: words.list(data.immunities.map(slugLabel), 'unit'),
    });
  }
  if (data.weaknesses.length > 0) {
    shown.push({
      label: words.translate(CreatureStatBlockMessage.Weaknesses),
      text: words.list(
        data.weaknesses.map((line) => adjustmentText(line, words)),
        'unit',
      ),
    });
  }
  if (data.resistances.length > 0) {
    shown.push({
      label: words.translate(CreatureStatBlockMessage.Resistances),
      text: words.list(
        data.resistances.map((line) => adjustmentText(line, words)),
        'unit',
      ),
    });
  }
  return shown;
}

function speeds({ data }: StatBlockCreature, words: StatBlockWords): StatLine {
  const others = (data.speeds ?? []).map((other) =>
    words.translate(CreatureStatBlockMessage.OtherSpeed, {
      movement: words.translate(MOVEMENT_MESSAGES[other.movement]),
      distance: words.distance(other.speed),
    }),
  );
  return {
    label: words.translate(CreatureStatBlockMessage.Speed),
    text: words.list([words.distance(data.speed), ...others], 'unit'),
  };
}
