import * as z from 'zod';

/**
 * Wire shape of a Pathbuilder 2e JSON export (`{ success, build }`), as its "Export JSON" menu writes it.
 *
 * Pathbuilder publishes no schema, so this follows real exports: every object is loose (new fields are tolerated)
 * and anything an older export may lack defaults to empty. Only what a character can't be read without is
 * required: name, class, level, ancestry, heritage, background, attribute scores and feats.
 */

const PATHBUILDER_LEVEL_MIN = 1;
const PATHBUILDER_LEVEL_MAX = 20;
/** Attribute scores in a legal build; remaster modifiers run -5 to +7, so 0 to 25 covers every export. */
const SCORE_MIN = 0;
const SCORE_MAX = 25;
/** Pathbuilder's proficiency numbers: 0 untrained, 2 trained, 4 expert, 6 master, 8 legendary. */
const PROFICIENCY_MAX = 8;
const SPELL_RANK_MAX = 10;
const NAME_MAX = 200;
const LIST_MAX = 500;

const Name = z.string().max(NAME_MAX);
const Names = z.array(Name).max(LIST_MAX).default([]);
const Count = z.int().nonnegative();
const ProficiencyNumber = z.int().min(0).max(PROFICIENCY_MAX);
const Score = z.int().min(SCORE_MIN).max(SCORE_MAX);
/** Level (as text) to the attributes boosted at it. */
const LevelledBoosts = z.record(z.string(), Names).default({});
const ModsByType = z.record(z.string(), z.int());
/** Statistic name to its bonuses by type ("Potency Bonus": 2). */
const Mods = z.record(z.string(), ModsByType).default({});

const AbilityScores = z.looseObject({
  str: Score,
  dex: Score,
  con: Score,
  int: Score,
  wis: Score,
  cha: Score,
  breakdown: z
    .looseObject({
      ancestryFree: Names,
      ancestryBoosts: Names,
      ancestryFlaws: Names,
      backgroundBoosts: Names,
      classBoosts: Names,
      mapLevelledBoosts: LevelledBoosts,
    })
    .optional(),
});

/** `[name, choice, type, level, slotLabel?, choiceType?, parent?]`; "Awarded Feat" entries stop after `level`. */
const FeatTuple = z.tuple(
  [Name, Name.nullable(), Name, z.int().min(0).max(PATHBUILDER_LEVEL_MAX)],
  z.union([Name, z.null()]),
);

/** `[name, proficiency]`. */
const LoreTuple = z.tuple([Name, ProficiencyNumber]);

/** `[name, quantity, container id or "Invested"?]`. */
const EquipmentTuple = z.tuple([Name, Count], z.unknown());

const Armor = z.looseObject({
  name: Name,
  qty: Count.default(1),
  prof: Name.optional(),
  display: Name.optional(),
  worn: z.boolean().default(false),
});

const Weapon = z.looseObject({
  name: Name,
  qty: Count.default(1),
  display: Name.optional(),
});

const SpellRankList = z.looseObject({
  spellLevel: z.int().min(0).max(SPELL_RANK_MAX),
  list: Names,
});

const SpellCaster = z.looseObject({
  name: Name,
  magicTradition: Name,
  spellcastingType: Name,
  innate: z.boolean().default(false),
  perDay: z
    .array(Count)
    .max(SPELL_RANK_MAX + 1)
    .default([]),
  spells: z
    .array(SpellRankList)
    .max(SPELL_RANK_MAX + 1)
    .default([]),
});

/** Per tradition, per attribute: the focus spells cast with it. */
const FocusTradition = z.record(
  z.string(),
  z.looseObject({ focusCantrips: Names, focusSpells: Names, proficiency: ProficiencyNumber.optional() }),
);

const Familiar = z.looseObject({ name: Name, abilities: Names });

const AcTotal = z.looseObject({
  acProfBonus: z.int(),
  acAbilityBonus: z.int(),
  acItemBonus: z.int(),
  acTotal: z.int(),
});

const Money = z.looseObject({ cp: Count.default(0), sp: Count.default(0), gp: Count.default(0), pp: Count.default(0) });

export const PathbuilderBuild = z.looseObject({
  name: Name.min(1),
  class: Name.min(1),
  dualClass: Name.nullable().optional(),
  level: z.int().min(PATHBUILDER_LEVEL_MIN).max(PATHBUILDER_LEVEL_MAX),
  ancestry: Name.min(1),
  heritage: Name,
  background: Name,
  deity: Name.optional(),
  keyability: Name.optional(),
  languages: Names,
  rituals: Names,
  abilities: AbilityScores,
  attributes: z
    .looseObject({
      ancestryhp: z.int(),
      classhp: z.int(),
      bonushp: z.int(),
      bonushpPerLevel: z.int(),
      speed: z.int(),
      speedBonus: z.int(),
    })
    .partial()
    .optional(),
  proficiencies: z.record(z.string(), ProficiencyNumber).default({}),
  mods: Mods,
  feats: z.array(FeatTuple).max(LIST_MAX),
  specials: Names,
  lores: z.array(LoreTuple).max(LIST_MAX).default([]),
  equipment: z.array(EquipmentTuple).max(LIST_MAX).default([]),
  weapons: z.array(Weapon).max(LIST_MAX).default([]),
  armor: z.array(Armor).max(LIST_MAX).default([]),
  money: Money.optional(),
  spellCasters: z.array(SpellCaster).max(LIST_MAX).default([]),
  focusPoints: Count.optional(),
  focus: z.record(z.string(), FocusTradition).default({}),
  acTotal: AcTotal.optional(),
  familiars: z.array(Familiar).max(LIST_MAX).default([]),
});
export type PathbuilderBuild = z.output<typeof PathbuilderBuild>;

/** The file as exported. `success: false` is how Pathbuilder marks a failed export. */
export const PathbuilderExport = z.looseObject({
  success: z.boolean(),
  build: PathbuilderBuild.optional(),
});
export type PathbuilderExport = z.input<typeof PathbuilderExport>;
