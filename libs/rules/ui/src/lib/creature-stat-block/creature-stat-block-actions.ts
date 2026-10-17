import { InlineKind } from '@pioneer/rules/sdk';
import type {
  CreatureAbility,
  CreatureDamage,
  CreatureSpellcasting,
  CreatureStrike,
  Frequency,
} from '@pioneer/rules/sdk';

import { SIGNED } from '../breakdown/number-style';
import { DAMAGE_TYPE_MESSAGES } from '../rich-text/rich-text-messages';
import { PREPARATION_MESSAGES, TRADITION_MESSAGES } from '../spellcasting/spellcasting-messages';
import type { AbilityLine, SpellcastingLine, StatPassage, StrikeLine } from './creature-stat-block';
import { CreatureStatBlockMessage, PERIOD_MESSAGES, STRIKE_RANGE_MESSAGES } from './creature-stat-block-messages';
import type { StatBlockWords } from './stat-block-words';

function damageText(damage: CreatureDamage, words: StatBlockWords): string {
  const dice = damage.die === undefined ? `${damage.dice}` : `${damage.dice}${damage.die}`;
  const bonus = damage.bonus === undefined || damage.bonus === 0 ? '' : `+${damage.bonus}`;
  const main = words.translate(CreatureStatBlockMessage.DamagePart, {
    amount: `${dice}${bonus}`,
    type: words.translate(DAMAGE_TYPE_MESSAGES[damage.damageType]),
  });
  if (damage.persistent === undefined) {
    return main;
  }
  const persistent = words.translate(CreatureStatBlockMessage.DamagePersistent, {
    amount: damage.persistent.formula,
    type: words.translate(DAMAGE_TYPE_MESSAGES[damage.persistent.damageType]),
  });
  return `${main} ${persistent}`;
}

export function strikeLine(strike: CreatureStrike, words: StatBlockWords): StrikeLine {
  const summary = words.translate(CreatureStatBlockMessage.Strike, {
    range: words.translate(STRIKE_RANGE_MESSAGES[strike.range]),
    name: strike.name,
    bonus: words.number(strike.bonus, SIGNED),
  });
  const reach =
    strike.reach === undefined
      ? []
      : [words.translate(CreatureStatBlockMessage.StrikeReach, { distance: words.distance(strike.reach) })];
  const increment =
    strike.increment === undefined
      ? []
      : [words.translate(CreatureStatBlockMessage.StrikeIncrement, { distance: words.distance(strike.increment) })];
  return {
    summary,
    traitsText: traitsText([...reach, ...increment, ...strike.traits], words),
    damage:
      strike.damage.length === 0
        ? undefined
        : {
            label: words.translate(CreatureStatBlockMessage.StrikeDamage),
            text: words.list(
              strike.damage.map((part) => damageText(part, words)),
              'conjunction',
            ),
          },
    effects: strike.effects,
  };
}

function frequencyText(frequency: Frequency, words: StatBlockWords): string {
  return `${words.number(frequency.max)} ${words.translate(PERIOD_MESSAGES[frequency.per])}`;
}

export function abilityLine(ability: CreatureAbility, words: StatBlockWords): AbilityLine {
  const passages: StatPassage[] = [];
  if (ability.requirements !== undefined) {
    passages.push({ label: words.translate(CreatureStatBlockMessage.Requirements), text: ability.requirements });
  }
  if (ability.trigger !== undefined) {
    passages.push({ label: words.translate(CreatureStatBlockMessage.Trigger), text: ability.trigger });
  }
  return {
    name: ability.name,
    cost: ability.cost,
    traits: ability.traits,
    lines:
      ability.frequency === undefined
        ? []
        : [
            {
              label: words.translate(CreatureStatBlockMessage.Frequency),
              text: frequencyText(ability.frequency, words),
            },
          ],
    passages,
    description: ability.description,
  };
}

function spellUses(
  spell: { readonly uses?: number | undefined; readonly constant?: true | undefined },
  words: StatBlockWords,
): string | undefined {
  if (spell.constant === true) {
    return words.translate(CreatureStatBlockMessage.SpellConstant);
  }
  return spell.uses === undefined
    ? undefined
    : words.translate(CreatureStatBlockMessage.SpellUses, { uses: words.number(spell.uses) });
}

export function spellcastingLine(entry: CreatureSpellcasting, words: StatBlockWords): SpellcastingLine {
  const heading = words.translate(CreatureStatBlockMessage.SpellcastingHeading, {
    tradition: words.translate(TRADITION_MESSAGES[entry.tradition]),
    preparation: words.translate(PREPARATION_MESSAGES[entry.preparation]),
  });
  const numbers = words.translate(CreatureStatBlockMessage.SpellcastingNumbers, {
    dc: words.number(entry.dc),
    hasAttack: entry.attack === undefined ? 'no' : 'yes',
    attack: entry.attack === undefined ? '' : words.number(entry.attack, SIGNED),
  });
  const byRank = Map.groupBy(entry.spells, (spell) => spell.rank);
  const ranks = [...byRank.entries()]
    .toSorted(([left], [right]) => right - left)
    .map(([rank, spells]) => ({
      rank: words.translate(CreatureStatBlockMessage.SpellRank, { rank: words.number(rank) }),
      spells: spells.map((spell) => ({
        ref: { type: InlineKind.Ref, id: spell.spell },
        uses: spellUses(spell, words),
      })),
    }));
  return { heading, numbers, ranks };
}

function traitsText(traits: readonly string[], words: StatBlockWords): string {
  return traits.length === 0 ? '' : `(${words.list(traits, 'unit')})`;
}
