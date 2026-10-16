import type { PackId } from '@pioneer/rules/sdk';

import { DOMAIN_SPELLS } from './domain-spells';
import {
  BARD,
  BARD_ENTRY,
  CLERIC,
  CLERIC_ENTRY,
  DRUID,
  focusChoice,
  focusEntry,
  focusSpells,
  isGrant,
  isNamed,
  RANGER,
  RANGER_ENTRY,
  WITCH,
} from './focus-plan';
import type { Planned } from './focus-plan';
import {
  BLESSED_ONE_DEDICATION_RULES,
  BLESSED_SACRIFICE_RULES,
  DEVOTION_SPELLS_RULES,
  DEVOUT_MAGIC_RULES,
} from './translate-champion-devotion';
import {
  DRUID_DEDICATION_RULES,
  ORDER_EXPLORER,
  ORDER_EXPLORER_RULES,
  ORDER_MAGIC_RULES,
  ORDER_SPELL_RULES,
  ORDERS,
  order,
} from './translate-druid-orders';
import { ARCANE_SCHOOL_SPELL_RULES, school, SCHOOLS, WIZARD_DEDICATION_RULES } from './translate-wizard-schools';

/**
 * The focus entries and focus spells of Player Core's class features and feats, as `SpellcastingEntry` elements with
 * preparation `focus` and `FocusSpells` elements by the entry slug they go on (ADR-0050). Foundry grants no focus
 * spell by rule element: the player drags each into a focus entry by hand, and Domain Initiate's `ChoiceSet` picks a
 * domain that grants nothing. The importer adds them from the features' text, and the domains' spells from Foundry's
 * domains journal, at `pf2e-8.6.0`. Spells are named by slug, in the pack being imported; a later book's focus spells
 * are added with its import (#606 for archetypes).
 */

function titleOf(domain: string): string {
  return `${domain.charAt(0).toUpperCase()}${domain.slice(1)}`;
}

const DOMAIN_INITIATE = 'domain-initiate';
const SELECT_DOMAIN = 'Select a domain.';

/** Domain Initiate: a domain of the deity's, primary or alternate, and its initial domain spell. */
const DOMAIN_INITIATE_RULES: Planned = [
  CLERIC_ENTRY,
  ...focusChoice({
    flag: DOMAIN_INITIATE,
    prompt: SELECT_DOMAIN,
    entry: CLERIC,
    options: [...DOMAIN_SPELLS].map(([domain, [initial]]) => ({
      value: domain,
      label: titleOf(domain),
      spells: [initial],
      predicate: [
        {
          or: [`deity:primary:domain:${domain}`, `deity:primary:alternate-domain:${domain}`],
        },
      ],
    })),
  }),
];

/** Advanced Domain: the advanced domain spell of a domain Domain Initiate picked. */
const ADVANCED_DOMAIN_RULES: Planned = focusChoice({
  flag: 'advanced-domain',
  prompt: SELECT_DOMAIN,
  entry: CLERIC,
  options: [...DOMAIN_SPELLS].flatMap(([domain, [, advanced]]) =>
    advanced === undefined
      ? []
      : [
          {
            value: domain,
            label: titleOf(domain),
            spells: [advanced],
            predicate: [`${DOMAIN_INITIATE}:${domain}`],
          },
        ],
  ),
});

/** A warden feat: one of its warden spells, picked. */
function warden(flag: string, spells: readonly (readonly [string, string])[]): Planned {
  return [
    RANGER_ENTRY,
    ...focusChoice({
      flag,
      prompt: 'Select a warden spell.',
      entry: RANGER,
      options: spells.map(([spell, label]) => ({
        value: spell,
        label,
        spells: [spell],
      })),
    }),
  ];
}

/** A witch's patron: the witch's focus entry in the patron's tradition, as its own entry is, and its hex cantrip. */
function patron(tradition: string, cantrip: string): Planned {
  return [focusEntry({ slug: WITCH, tradition, attribute: 'int' }), { entry: WITCH, spells: [cantrip] }];
}

/** A lesson's hex. */
function lesson(hex: string): Planned {
  return [{ entry: WITCH, spells: [hex] }];
}

/** A feat or feature that teaches one focus spell of an entry the class already has. */
function learn(entry: string, spell: string): Planned {
  return [{ entry, spells: [spell] }];
}

/** The focus entries, choices and focus spells each entry gains, by its entry slug. */
const FOCUS: ReadonlyMap<string, Planned> = new Map([
  // Bard: Composition Spells teaches Counter Performance and the Courageous Anthem cantrip.
  // Feats teach the rest; one that only changes how a composition works (Courageous Advance) teaches nothing.
  [
    'class-feature:composition-spells',
    [BARD_ENTRY, { entry: BARD, spells: ['counter-performance', 'courageous-anthem'] }],
  ],
  ['feat:allegro', learn(BARD, 'allegro')],
  ['feat:dirge-of-doom', learn(BARD, 'dirge-of-doom')],
  ['feat:fatal-aria', learn(BARD, 'fatal-aria')],
  ['feat:fortissimo-composition', learn(BARD, 'fortissimo-composition')],
  ['feat:house-of-imaginary-walls', learn(BARD, 'house-of-imaginary-walls')],
  ['feat:hymn-of-healing', learn(BARD, 'hymn-of-healing')],
  ['feat:lingering-composition', learn(BARD, 'lingering-composition')],
  ['feat:loremasters-etude', learn(BARD, 'loremasters-etude')],
  ['feat:ode-to-ouroboros', learn(BARD, 'ode-to-ouroboros')],
  ['feat:pied-piping', learn(BARD, 'pied-piping')],
  ['feat:rallying-anthem', learn(BARD, 'rallying-anthem')],
  ['feat:song-of-marching', learn(BARD, 'song-of-marching')],
  ['feat:song-of-strength', learn(BARD, 'song-of-strength')],
  ['feat:soothing-ballad', learn(BARD, 'soothing-ballad')],
  ['feat:symphony-of-the-unfettered-heart', learn(BARD, 'symphony-of-the-unfettered-heart')],
  ['feat:triple-time', learn(BARD, 'triple-time')],
  ['feat:uplifting-overture', learn(BARD, 'uplifting-overture')],
  // Cleric.
  ['feat:domain-initiate', DOMAIN_INITIATE_RULES],
  ['feat:advanced-domain', ADVANCED_DOMAIN_RULES],
  // Druid: each order's order spell, and the feats that teach another.
  ...ORDERS.map(([slug, , spell]): [string, Planned] => [`class-feature:${slug}`, order(slug, spell)]),
  [ORDER_EXPLORER, ORDER_EXPLORER_RULES],
  ['feat:order-magic', ORDER_MAGIC_RULES],
  ['feat:impaling-briars', learn(DRUID, 'impaling-briars')],
  ['feat:invoke-disaster', learn(DRUID, 'storm-lord')],
  ['feat:primal-summons', learn(DRUID, 'primal-summons')],
  ['feat:untamed-form', learn(DRUID, 'untamed-form')],
  ['feat:wind-caller', learn(DRUID, 'stormwind-flight')],
  // Ranger: each warden feat picks one warden spell of its tier, and its first makes the ranger a focus caster.
  [
    'feat:initiate-warden',
    warden('initiate-warden', [
      ['gravity-weapon', 'Gravity Weapon'],
      ['heal-companion', 'Heal Companion'],
      ['magic-hide', 'Magic Hide'],
    ]),
  ],
  [
    'feat:advanced-warden',
    warden('advanced-warden', [
      ['animal-feature', 'Animal Feature'],
      ['enlarge-companion', 'Enlarge Companion'],
      ['hunters-luck', "Hunter's Luck"],
      ['soothing-mist', 'Soothing Mist'],
    ]),
  ],
  [
    'feat:masterful-warden',
    warden('masterful-warden', [
      ['ephemeral-tracking', 'Ephemeral Tracking'],
      ['rangers-bramble', "Ranger's Bramble"],
    ]),
  ],
  [
    'feat:peerless-warden',
    warden('peerless-warden', [
      ['hunters-vision', "Hunter's Vision"],
      ['terrain-transposition', 'Terrain Transposition'],
    ]),
  ],
  // Witch: the patron's hex cantrip, Hex Spells' pick of two hexes, each lesson's hex, and Cackle.
  ['class-feature:faiths-flamekeeper', patron('divine', 'stoke-the-heart')],
  ['class-feature:silence-in-snow', patron('primal', 'clinging-ice')],
  ['class-feature:spinner-of-threads', patron('occult', 'nudge-fate')],
  ['class-feature:starless-shadow', patron('occult', 'shroud-of-night')],
  ['class-feature:the-inscribed-one', patron('arcane', 'discern-secrets')],
  ['class-feature:the-resentment', patron('occult', 'evil-eye')],
  ['class-feature:wilding-steward', patron('primal', 'wilding-word')],
  [
    'class-feature:hex-spells',
    focusChoice({
      flag: 'hex-spells',
      prompt: 'Select a hex.',
      entry: WITCH,
      options: [
        {
          value: 'patrons-puppet',
          label: "Patron's Puppet",
          spells: ['patrons-puppet'],
        },
        {
          value: 'phase-familiar',
          label: 'Phase Familiar',
          spells: ['phase-familiar'],
        },
      ],
    }),
  ],
  ['class-feature:lesson-of-death', lesson('curse-of-death')],
  ['class-feature:lesson-of-dreams', lesson('veil-of-dreams')],
  ['class-feature:lesson-of-elements', lesson('elemental-betrayal')],
  ['class-feature:lesson-of-life', lesson('life-boost')],
  ['class-feature:lesson-of-mischief', lesson('deceivers-cloak')],
  ['class-feature:lesson-of-protection', lesson('blood-ward')],
  ['class-feature:lesson-of-renewal', lesson('restorative-moment')],
  ['class-feature:lesson-of-shadow', lesson('malicious-shadow')],
  ['class-feature:lesson-of-snow', lesson('personal-blizzard')],
  ['class-feature:lesson-of-vengeance', lesson('needle-of-vengeance')],
  ['feat:cackle', learn(WITCH, 'cackle')],
  // Wizard: each school's initial and advanced school spells. The archetype picks a school with its dedication, and
  // Arcane School Spell teaches the initial spell.
  ...SCHOOLS.map(([slug, , initial, advanced]): [string, Planned] => [
    `class-feature:${slug}`,
    school(initial, advanced),
  ]),
  ['feat:wizard-dedication', WIZARD_DEDICATION_RULES],
  ['feat:arcane-school-spell', ARCANE_SCHOOL_SPELL_RULES],
  // Bard and druid archetypes: Counter Perform teaches Counter Performance, Order Spell the dedication order's spell.
  ['feat:counter-perform', [BARD_ENTRY, { entry: BARD, spells: ['counter-performance'] }]],
  ['feat:druid-dedication', DRUID_DEDICATION_RULES],
  ['feat:order-spell', ORDER_SPELL_RULES],
  // Champion: the devotion spell, and the archetypes that grant one.
  ['class-feature:devotion-spells', DEVOTION_SPELLS_RULES],
  ['feat:devout-magic', DEVOUT_MAGIC_RULES],
  ['feat:blessed-one-dedication', BLESSED_ONE_DEDICATION_RULES],
  ['feat:blessed-sacrifice', BLESSED_SACRIFICE_RULES],
]);

/** The focus entry, choices and `FocusSpells` elements the entry with `slug` gains in `pack`, if any. */
export function focusSpellRules(slug: string, pack: PackId): readonly object[] {
  return (FOCUS.get(slug) ?? []).map((element) => {
    if (isNamed(element)) {
      return element(pack);
    }
    return isGrant(element) ? focusSpells(pack, element) : element;
  });
}
