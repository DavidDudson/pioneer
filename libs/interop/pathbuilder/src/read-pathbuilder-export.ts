import { CharacterLevel, CharacterName } from '@pioneer/character/domain';
import { Attribute, AttributeModifier, AttributeModifiers, Proficiency } from '@pioneer/rules/sdk';
import type { AttributeModifiersWire } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import { ImportKind, PathbuilderName } from './import-kind';
import type { ImportedName } from './import-kind';
import { PathbuilderBuild, PathbuilderExport } from './pathbuilder-export';

/** Why an export could not be read. The UI maps each to a message key. */
export const PathbuilderProblem = {
  /** Not JSON, or JSON that isn't a Pathbuilder export. */
  Malformed: 'malformed',
  /** Pathbuilder wrote `success: false`: its own export failed. */
  ExportFailed: 'export-failed',
} as const;
export type PathbuilderProblem = ValueOf<typeof PathbuilderProblem>;

/** A lore skill and its rank. Lores are skills, not content entries, so they are carried, not matched. */
export interface ImportedLore {
  readonly name: PathbuilderName;
  readonly rank: Proficiency;
}

/** The parts of a character Pioneer's model can hold today, named as Pathbuilder named them. */
export interface PathbuilderIdentity {
  readonly ancestry: PathbuilderName;
  readonly heritage: PathbuilderName | undefined;
  readonly background: PathbuilderName | undefined;
  /** Class first, then the dual class when the build has one. */
  readonly classes: readonly PathbuilderName[];
}

/**
 * Values Pathbuilder computed. Kept apart and never imported (ADR-0004): the discrepancy report (#312) compares
 * them with the engine's.
 */
export type PathbuilderReported = Pick<PathbuilderBuild, 'acTotal' | 'attributes' | 'focus' | 'mods' | 'proficiencies'>;

/** A Pathbuilder export read into Pioneer's terms, before any content is matched. */
export interface PathbuilderImport {
  readonly name: CharacterName;
  readonly level: CharacterLevel;
  readonly attributes: AttributeModifiers;
  readonly identity: PathbuilderIdentity;
  /** Every reference to a content entry, in export order, repeats kept. */
  readonly names: readonly ImportedName[];
  readonly lores: readonly ImportedLore[];
  readonly reported: PathbuilderReported;
}

export interface PathbuilderRead {
  readonly ok: true;
  readonly value: PathbuilderImport;
}

export interface PathbuilderReadFailure {
  readonly ok: false;
  readonly problem: PathbuilderProblem;
  readonly issues: readonly z.core.$ZodIssue[];
}

export type PathbuilderReadResult = PathbuilderRead | PathbuilderReadFailure;

/** Pathbuilder's placeholders for "nothing chosen". */
const UNSET_NAMES: ReadonlySet<string> = new Set(['', 'Not set', 'None']);
/** Pathbuilder's armour row for "no base armour"; its runes are worn on clothing, not an armour entry. */
const UNARMORED = 'Unarmored';

const SCORE_BASE = 10;
const SCORE_STEP = 2;

const RANK_BY_NUMBER: Readonly<Record<number, Proficiency>> = {
  0: Proficiency.Untrained,
  2: Proficiency.Trained,
  4: Proficiency.Expert,
  6: Proficiency.Master,
  8: Proficiency.Legendary,
};

function failure(problem: PathbuilderProblem, issues: readonly z.core.$ZodIssue[] = []): PathbuilderReadFailure {
  return { ok: false, problem, issues };
}

function chosen(name: string | null | undefined): PathbuilderName | undefined {
  const trimmed = name?.trim() ?? '';
  return UNSET_NAMES.has(trimmed) ? undefined : PathbuilderName.parse(trimmed);
}

/** Remaster modifier from a legacy score: (score - 10) / 2, rounded down (ADR-0014). */
function modifier(score: number): AttributeModifier {
  return AttributeModifier.parse(Math.floor((score - SCORE_BASE) / SCORE_STEP));
}

function attributeModifiers(build: PathbuilderBuild): AttributeModifiers {
  const { abilities } = build;
  const wire: AttributeModifiersWire = {
    [Attribute.Strength]: modifier(abilities.str),
    [Attribute.Dexterity]: modifier(abilities.dex),
    [Attribute.Constitution]: modifier(abilities.con),
    [Attribute.Intelligence]: modifier(abilities.int),
    [Attribute.Wisdom]: modifier(abilities.wis),
    [Attribute.Charisma]: modifier(abilities.cha),
  };
  return new AttributeModifiers(wire);
}

function named(kind: ImportKind, names: readonly (string | null | undefined)[]): ImportedName[] {
  return names.flatMap((raw) => {
    const name = chosen(raw);
    return name === undefined ? [] : [{ kind, name }];
  });
}

function spellNames(build: PathbuilderBuild): (string | undefined)[] {
  const casters = build.spellCasters.flatMap((caster) => caster.spells.flatMap((rank) => rank.list));
  const focus = Object.values(build.focus).flatMap((byAttribute) => Object.values(byAttribute));
  return [...casters, ...focus.flatMap((entry) => entry.focusCantrips), ...focus.flatMap((entry) => entry.focusSpells)];
}

function itemNames(build: PathbuilderBuild): string[] {
  return [
    ...build.equipment.map(([name]) => name),
    ...build.weapons.map((weapon) => weapon.name),
    ...build.armor.filter((armor) => armor.name !== UNARMORED).map((armor) => armor.name),
  ];
}

function contentNames(build: PathbuilderBuild): ImportedName[] {
  return [
    ...named(ImportKind.Ancestry, [build.ancestry]),
    ...named(ImportKind.Heritage, [build.heritage]),
    ...named(ImportKind.Background, [build.background]),
    ...named(ImportKind.Class, [build.class, build.dualClass]),
    ...named(ImportKind.Deity, [build.deity]),
    ...named(
      ImportKind.Feat,
      build.feats.map(([name]) => name),
    ),
    ...named(ImportKind.ClassFeature, build.specials),
    ...named(ImportKind.Spell, spellNames(build)),
    ...named(ImportKind.Ritual, build.rituals),
    ...named(ImportKind.Item, itemNames(build)),
    ...named(ImportKind.Language, build.languages),
  ];
}

function lores(build: PathbuilderBuild): ImportedLore[] {
  return build.lores.flatMap(([raw, number]) => {
    const name = chosen(raw);
    const rank = RANK_BY_NUMBER[number];
    return name === undefined || rank === undefined ? [] : [{ name, rank }];
  });
}

function identity(build: PathbuilderBuild, ancestry: PathbuilderName): PathbuilderIdentity {
  return {
    ancestry,
    heritage: chosen(build.heritage),
    background: chosen(build.background),
    classes: [chosen(build.class), chosen(build.dualClass)].filter((name) => name !== undefined),
  };
}

function toImport(build: PathbuilderBuild): PathbuilderReadResult {
  const name = CharacterName.safeParse(build.name);
  const ancestry = chosen(build.ancestry);
  if (!name.success) {
    return failure(
      PathbuilderProblem.Malformed,
      name.error.issues.map((issue) => ({ ...issue, path: ['build', 'name', ...issue.path] })),
    );
  }
  if (ancestry === undefined) {
    const issue: z.core.$ZodIssue = {
      code: 'custom',
      path: ['build', 'ancestry'],
      message: 'Pathbuilder export has no ancestry',
      input: build.ancestry,
    };
    return failure(PathbuilderProblem.Malformed, [issue]);
  }
  const value: PathbuilderImport = {
    name: name.data,
    level: CharacterLevel.parse(build.level),
    attributes: attributeModifiers(build),
    identity: identity(build, ancestry),
    names: contentNames(build),
    lores: lores(build),
    reported: {
      acTotal: build.acTotal,
      attributes: build.attributes,
      focus: build.focus,
      mods: build.mods,
      proficiencies: build.proficiencies,
    },
  };
  return { ok: true, value };
}

const NOT_JSON = Symbol('not JSON');

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return NOT_JSON;
  }
}

/**
 * Read a Pathbuilder 2e export: the parsed JSON object, or its text. Never throws; a file that isn't a usable
 * export comes back as a problem with the zod issues that explain it.
 */
export function readPathbuilderExport(input: unknown): PathbuilderReadResult {
  const json = typeof input === 'string' ? parseJson(input) : input;
  if (json === NOT_JSON) {
    return failure(PathbuilderProblem.Malformed);
  }
  const parsed = PathbuilderExport.safeParse(json);
  if (!parsed.success) {
    return failure(PathbuilderProblem.Malformed, parsed.error.issues);
  }
  const { success, build } = parsed.data;
  if (!success) {
    return failure(PathbuilderProblem.ExportFailed);
  }
  if (build === undefined) {
    return failure(PathbuilderProblem.Malformed, PathbuilderBuild.safeParse(undefined).error?.issues ?? []);
  }
  return toImport(build);
}
