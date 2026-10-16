import { RuleElementKey } from '@pioneer/rules/sdk';

import { focusEntry, SORCERER } from './focus-plan';
import type { Grant, Planned } from './focus-plan';

/**
 * A sorcerer's bloodline: its feature's slug, its name, its tradition and its initial, advanced and greater bloodline
 * spells. A draconic bloodline's tradition is its exemplar's, so it has all four.
 */
export interface Bloodline {
  readonly slug: string;
  readonly name: string;
  readonly traditions: readonly string[];
  readonly initial: string;
  readonly advanced: string;
  readonly greater: string;
}

const DRACONIC = 'bloodline-draconic';
const DRACONIC_TRADITIONS = ['arcane', 'divine', 'occult', 'primal'];

function titled(word: string): string {
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
}

function of(slug: string, tradition: string, spells: readonly [string, string, string]): Bloodline {
  const [initial, advanced, greater] = spells;
  return { slug, name: titled(slug.replace('bloodline-', '')), traditions: [tradition], initial, advanced, greater };
}

export const BLOODLINES: readonly Bloodline[] = [
  of('bloodline-aberrant', 'occult', ['tentacular-limbs', 'aberrant-whispers', 'unusual-anatomy']),
  of('bloodline-angelic', 'divine', ['angelic-halo', 'angelic-wings', 'celestial-brand']),
  of('bloodline-demonic', 'divine', ['gluttons-jaws', 'swamp-of-sloth', 'chthonian-wrath']),
  of('bloodline-diabolic', 'divine', ['diabolic-edict', 'embrace-the-pit', 'hellfire-plume']),
  {
    ...of(DRACONIC, 'arcane', ['flurry-of-claws', 'dragon-breath', 'dragon-wings']),
    traditions: DRACONIC_TRADITIONS,
  },
  of('bloodline-elemental', 'primal', ['elemental-toss', 'elemental-motion', 'elemental-blast']),
  of('bloodline-fey', 'primal', ['faerie-dust', 'fey-disappearance', 'fey-glamour']),
  of('bloodline-hag', 'occult', ['jealous-hex', 'horrific-visage', 'youre-mine']),
  of('bloodline-imperial', 'arcane', ['ancestral-memories', 'extend-blood-magic', 'arcane-countermeasure']),
  of('bloodline-undead', 'divine', ['undeaths-blessing', 'drain-life', 'grasping-grave']),
];

const SORCERER_DEDICATION = 'feat:sorcerer-dedication';
const CROSSBLOODED = { not: 'parent:granter:slug:crossblooded-evolution' };

/** The sorcerer's focus entry in `tradition`, holding while `predicate` does. */
function entryOf(tradition: string, predicate: readonly unknown[]): object {
  return { ...focusEntry({ slug: SORCERER, tradition, attribute: 'cha' }), predicate };
}

function grant(spell: string, predicate: readonly unknown[]): Grant {
  return { entry: SORCERER, spells: [spell], predicate };
}

/**
 * A sorcerer's bloodline: the sorcerer's focus entry in its tradition (a draconic bloodline's exemplar's) and its
 * initial bloodline spell, then its advanced and greater ones once the sorcerer takes Advanced and Greater Bloodline.
 * A bloodline Crossblooded Evolution joins grants none of its spells, as it grants none of its other benefits.
 */
export function bloodline({ slug, traditions, initial, advanced, greater }: Bloodline): Planned {
  return [
    ...traditions.map((tradition) =>
      entryOf(tradition, slug === DRACONIC ? [CROSSBLOODED, `draconic-exemplar:${tradition}`] : [CROSSBLOODED]),
    ),
    grant(initial, [CROSSBLOODED]),
    grant(advanced, [CROSSBLOODED, 'feat:advanced-bloodline']),
    grant(greater, [CROSSBLOODED, 'feat:greater-bloodline']),
  ];
}

/** A bloodline Sorcerer Dedication offers, and the tradition and initial spell it gives. */
interface Offered {
  readonly value: string;
  readonly label: string;
  readonly tradition: string;
  readonly initial: string;
}

/** A draconic bloodline is offered once for each exemplar, as the exemplar sets the tradition. */
const OFFERED: readonly Offered[] = BLOODLINES.flatMap(({ slug, name, traditions, initial }): readonly Offered[] => {
  const value = slug.replace('bloodline-', '');
  return traditions.map((tradition): Offered =>
    traditions.length === 1
      ? { value, label: name, tradition, initial }
      : { value: `${value}-${tradition}`, label: `${name} (${titled(tradition)})`, tradition, initial },
  );
});

/**
 * Sorcerer Dedication: the bloodline the archetype picks, a draconic one with its exemplar, which grants no ability of
 * its own. The pick sets `feat:sorcerer-dedication:<bloodline>`, which Basic Bloodline Spell reads.
 */
export const SORCERER_DEDICATION_RULES: Planned = [
  {
    key: RuleElementKey.ChoiceSet,
    flag: 'bloodline',
    rollOption: SORCERER_DEDICATION,
    prompt: 'Select a bloodline.',
    choices: OFFERED.map(({ value, label }) => ({ value, label })),
  },
];

/** Basic Bloodline Spell: the initial bloodline spell of the bloodline Sorcerer Dedication picked, in its tradition. */
export const BASIC_BLOODLINE_SPELL_RULES: Planned = OFFERED.flatMap(({ value, tradition, initial }): Planned => {
  const predicate = [`${SORCERER_DEDICATION}:${value}`];
  return [entryOf(tradition, predicate), grant(initial, predicate)];
});
