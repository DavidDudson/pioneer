import { contentId, EntrySlug, RuleElementKey } from '@pioneer/rules/sdk';
import type { PackId } from '@pioneer/rules/sdk';

import { DOMAIN_SPELLS } from './domain-spells';

/**
 * The focus entries and focus spells of Player Core's class features and feats, as `SpellcastingEntry` elements with
 * preparation `focus` and `FocusSpells` elements by the entry slug they go on (ADR-0048). Foundry grants no focus
 * spell by rule element: the player drags each into a focus entry by hand, and Domain Initiate's `ChoiceSet` picks a
 * domain that grants nothing. The importer adds them from the features' text, and the domains' spells from Foundry's
 * domains journal, at `pf2e-8.6.0`. Spells are named by slug, in the pack being imported; a later book's focus spells
 * are added with its import (#606 for archetypes).
 */

interface FocusEntryFields {
  readonly slug: string;
  readonly tradition: string;
  readonly attribute: string;
}

/** A focus entry: where its focus spells' spell attack and DC come from. */
function focusEntry(fields: FocusEntryFields): object {
  return { key: RuleElementKey.SpellcastingEntry, ...fields, preparation: 'focus' };
}

const BARD = 'bard-focus';
const CLERIC = 'cleric-focus';
const DRUID = 'druid-focus';
const RANGER = 'ranger-focus';
const WITCH = 'witch-focus';
const WIZARD = 'wizard-focus';

const BARD_ENTRY = focusEntry({ slug: BARD, tradition: 'occult', attribute: 'cha' });
const CLERIC_ENTRY = focusEntry({ slug: CLERIC, tradition: 'divine', attribute: 'wis' });
const DRUID_ENTRY = focusEntry({ slug: DRUID, tradition: 'primal', attribute: 'wis' });
const RANGER_ENTRY = focusEntry({ slug: RANGER, tradition: 'primal', attribute: 'wis' });

const WIZARD_ENTRY = focusEntry({ slug: WIZARD, tradition: 'arcane', attribute: 'int' });

/** A focus spells element's entry, its spells by slug, and the predicate it holds on, if any. */
interface Grant {
  readonly entry: string;
  readonly spells: readonly string[];
  readonly predicate?: readonly unknown[];
}

/** The rule elements of one entry, before its spells are named in the pack being imported. */
type Planned = readonly (object | Grant)[];

function isGrant(element: object | Grant): element is Grant {
  return 'spells' in element && !('key' in element);
}

function focusSpells(pack: PackId, { entry, spells, predicate }: Grant): object {
  return {
    key: RuleElementKey.FocusSpells,
    entry,
    spells: spells.map((spell) => contentId(pack, EntrySlug.parse(`spell:${spell}`))),
    ...(predicate === undefined ? {} : { predicate }),
  };
}

/** One option of a choice that grants a focus spell: its value, its label, and the spells it grants. */
interface FocusOption {
  readonly value: string;
  readonly label: string;
  readonly spells: readonly string[];
  readonly predicate?: readonly unknown[];
}

/** A choice of focus spells: the flag its pick is stored under, its prompt, the focus entry, and its options. */
interface FocusChoice {
  readonly flag: string;
  readonly prompt: string;
  readonly entry: string;
  readonly options: readonly FocusOption[];
}

/**
 * A `ChoiceSet` under `flag` whose pick becomes the roll option `<flag>:<value>`, and a focus spells element per
 * option, holding while it is picked: an Initiate Warden's warden spell, a domain.
 */
function focusChoice({ flag, prompt, entry, options }: FocusChoice): Planned {
  return [
    {
      key: RuleElementKey.ChoiceSet,
      flag,
      rollOption: flag,
      prompt,
      choices: options.map(({ value, label, predicate }) => ({
        value,
        label,
        ...(predicate === undefined ? {} : { predicate }),
      })),
    },
    ...options.map(({ value, spells }): Grant => ({ entry, spells, predicate: [`${flag}:${value}`] })),
  ];
}

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
      predicate: [{ or: [`deity:primary:domain:${domain}`, `deity:primary:alternate-domain:${domain}`] }],
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
      : [{ value: domain, label: titleOf(domain), spells: [advanced], predicate: [`${DOMAIN_INITIATE}:${domain}`] }],
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
      options: spells.map(([spell, label]) => ({ value: spell, label, spells: [spell] })),
    }),
  ];
}

/** A wizard's school: its initial school spell, and its advanced one once the wizard takes Advanced School Spell. */
function school(initial: string, advanced: string): Planned {
  return [
    WIZARD_ENTRY,
    { entry: WIZARD, spells: [initial] },
    { entry: WIZARD, spells: [advanced], predicate: ['feat:advanced-school-spell'] },
  ];
}

/**
 * A druid's order: its order spell, unless the order was joined through Order Explorer, which grants none of its other
 * benefits (Order Magic grants its spell, #604). Guarded as Foundry guards an order's own benefits.
 */
function order(slug: string, spell: string): Planned {
  const predicate = [{ not: `feat:order-explorer:${slug}` }];
  return [
    { ...DRUID_ENTRY, predicate },
    { entry: DRUID, spells: [spell], predicate },
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
  ['class-feature:animal-order', order('animal-order', 'heal-animal')],
  ['class-feature:leaf-order', order('leaf-order', 'cornucopia')],
  ['class-feature:storm-order', order('storm-order', 'tempest-surge')],
  ['class-feature:untamed-order', order('untamed-order', 'untamed-shift')],
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
        { value: 'patrons-puppet', label: "Patron's Puppet", spells: ['patrons-puppet'] },
        { value: 'phase-familiar', label: 'Phase Familiar', spells: ['phase-familiar'] },
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
  // Wizard: each school's initial and advanced school spells.
  ['class-feature:school-of-ars-grammatica', school('protective-wards', 'rune-of-observation')],
  ['class-feature:school-of-battle-magic', school('force-bolt', 'energy-absorption')],
  ['class-feature:school-of-civic-wizardry', school('earthworks', 'community-restoration')],
  ['class-feature:school-of-mentalism', school('charming-push', 'invisibility-cloak')],
  ['class-feature:school-of-protean-form', school('scramble-body', 'shifting-form')],
  ['class-feature:school-of-the-boundary', school('fortify-summoning', 'spiral-of-horrors')],
  ['class-feature:school-of-unified-magical-theory', school('hand-of-the-apprentice', 'interdisciplinary-incantation')],
]);

/** The focus entry, choices and `FocusSpells` elements the entry with `slug` gains in `pack`, if any. */
export function focusSpellRules(slug: string, pack: PackId): readonly object[] {
  return (FOCUS.get(slug) ?? []).map((element) => (isGrant(element) ? focusSpells(pack, element) : element));
}
