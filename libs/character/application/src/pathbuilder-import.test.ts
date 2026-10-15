import { beforeEach, describe, expect, test } from 'bun:test';

import {
  ANCESTRY_SLOT,
  BACKGROUND_SLOT,
  BoostSource,
  CharacterCommand,
  CharacterLevel,
  CharacterName,
  CharacterSort,
  CLASS_SLOT,
  HERITAGE_SLOT,
} from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import {
  ImportKind,
  Occurrences,
  PathbuilderName,
  UncarriedField,
  UnmatchedReason,
} from '@pioneer/interop/pathbuilder';
import type { CharacterImportReport, UnmatchedName } from '@pioneer/interop/pathbuilder';
import { briarRoseExport, mordredExport } from '@pioneer/interop/pathbuilder/testing';
import { Attribute, ChoiceValue, ContentKind, Level } from '@pioneer/rules/sdk';
import type { ContentSource } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, SortDirection, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemoryCharacterVariantRepository } from './in-memory-character-variant-repository';
import { PathbuilderImportService } from './pathbuilder-import-service';

const amiri = UserId.parse(newId());
const byName = { sort: CharacterSort.Name, direction: SortDirection.Asc } as const;
const changeling = PathbuilderName.parse('Changeling');
const clock = fixedClock('2026-10-07T10:00:00Z');

/** Briar Rose's goloma animist, everything her export names loaded: a free ancestry boost and no ancestry flaw. */
function briarContent(): ContentSource {
  const all = Object.values(Attribute);
  return fixedContent(
    new ContentPackBuilder()
      .withId('howl-of-the-wild')
      .withAncestry('goloma', { boosts: [all] })
      .withHeritage('vigilant-goloma', 'goloma')
      .withBackground('dendrologist', [['con', 'wis'], all])
      .withClass('animist', ['wis'])
      .build(),
  );
}

/** The heritage names an import left behind, if any. */
function unmatchedHeritage(report: CharacterImportReport): readonly UnmatchedName[] | undefined {
  return report.unmatched.find((group) => group.kind === ImportKind.Heritage)?.names;
}

/** The service that imports into `repository` over `content`, enabling variant rules in `variants`. */
function importerOver(
  content: ContentSource,
  repository: InMemoryCharacterRepository,
  variants = new InMemoryCharacterVariantRepository(),
): PathbuilderImportService {
  return new PathbuilderImportService({ characters: repository, content, variants }, clock);
}

describe('PathbuilderImportService.importPathbuilder', () => {
  let service: PathbuilderImportService;
  let characters: CharacterService;
  let repository: InMemoryCharacterRepository;

  beforeEach(() => {
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    repository = new InMemoryCharacterRepository();
    service = importerOver(content, repository);
    characters = new CharacterService(repository, content, clock);
  });

  test('creates the character with name, ancestry and level, owned by the actor, its free boosts placed', async () => {
    const { character } = await service.importPathbuilder(amiri, mordredExport);
    expect(character.name).toBe(CharacterName.parse('Mordred (Dual Class)'));
    expect(character.ownerId).toBe(amiri);
    expect(character.ancestry).toBe(humanAncestryId);
    expect(character.level).toBe(CharacterLevel.parse(12));
    expect<Readonly<Record<string, string>>>(character.document.build.choices).toMatchObject({
      [ANCESTRY_SLOT]: ChoiceValue.parse(humanAncestryId),
      'boost:1:free:0': 'str',
      'boost:1:free:3': 'wis',
      'boost:15:free:0': 'cha',
    });
    expect(await characters.get(amiri, character.id)).toStrictEqual(character);
  });

  test('reports the boosts with no set to go to, and each modifier that then differs from Pathbuilder', async () => {
    const { report } = await service.importPathbuilder(amiri, mordredExport);
    expect(report.unplacedBoosts).toContainEqual({
      source: BoostSource.Background,
      level: Level.parse(1),
      attribute: Attribute.Charisma,
    });
    expect(report.modifierDifferences.map((difference) => difference.attribute)).toContain(Attribute.Charisma);
  });

  test('the write runs as importPathbuilder, once', async () => {
    await service.importPathbuilder(amiri, mordredExport);
    expect(repository.audits).toStrictEqual([{ actor: amiri, command: CharacterCommand.ImportPathbuilder }]);
  });

  test('reads a JSON string the same as the parsed export', async () => {
    const { character } = await service.importPathbuilder(amiri, JSON.stringify(mordredExport));
    expect(character.level).toBe(CharacterLevel.parse(12));
  });

  test('reports unmatched names by kind and what the character cannot hold yet', async () => {
    const { character, report } = await service.importPathbuilder(amiri, mordredExport);
    expect(report.unmatched.map((group) => group.kind)).not.toContain(ImportKind.Ancestry);
    expect(unmatchedHeritage(report)).toStrictEqual([
      { name: changeling, occurrences: Occurrences.parse(1), reason: UnmatchedReason.Unmatched },
    ]);
    expect(Object.keys(character.document.build.choices)).not.toContain(HERITAGE_SLOT);
    expect(report.notCarried).toContain(UncarriedField.ClassFeature);
    expect(report.skillGaps.map((gap) => gap.name)).toContain(PathbuilderName.parse('Hag'));
    expect(report.notCarried).not.toContain(UncarriedField.Deity);
  });

  test('a loaded heritage the ancestry offers fills the slot: one of its own or a versatile one', async () => {
    const own = new ContentPackBuilder()
      .withId('player-core')
      .withAncestry('human')
      .withHeritage('changeling', 'human');
    const versatile = new ContentPackBuilder().withId('player-core').withAncestry('human').withHeritage('changeling');
    for (const pack of [own, versatile]) {
      const heritages = importerOver(fixedContent(pack.build()), repository);
      // oxlint-disable-next-line no-await-in-loop -- two cases, one after the other
      const { character, report } = await heritages.importPathbuilder(amiri, mordredExport);
      const changelingId = ChoiceValue.parse(pack.idOf(ContentKind.Heritage, 'changeling'));
      expect(character.document.build.choices[HERITAGE_SLOT]).toBe(changelingId);
      expect(unmatchedHeritage(report)).toBeUndefined();
    }
  });

  test('a loaded heritage of another ancestry is reported as not offered, and not written', async () => {
    const pack = new ContentPackBuilder()
      .withId('player-core')
      .withAncestry('human')
      .withAncestry('elf')
      .withHeritage('changeling', 'elf')
      .build();
    const elsewhere = importerOver(fixedContent(pack), repository);
    const { character, report } = await elsewhere.importPathbuilder(amiri, mordredExport);
    expect(Object.keys(character.document.build.choices)).not.toContain(HERITAGE_SLOT);
    expect(unmatchedHeritage(report)).toStrictEqual([
      { name: changeling, occurrences: Occurrences.parse(1), reason: UnmatchedReason.NotOffered },
    ]);
    expect(repository.audits).toStrictEqual([{ actor: amiri, command: CharacterCommand.ImportPathbuilder }]);
  });

  test('fills the heritage, background, class and every boost; the modifiers come out as Pathbuilder scored them', async () => {
    const briar = importerOver(briarContent(), repository);
    const { character, report } = await briar.importPathbuilder(amiri, briarRoseExport);
    const { choices } = character.document.build;
    const slots = [HERITAGE_SLOT, BACKGROUND_SLOT, CLASS_SLOT];
    expect(slots.filter((slot) => choices[slot] === undefined)).toStrictEqual([]);
    expect(report.unmatched.map((group) => group.kind)).not.toContain(ImportKind.Heritage);
    expect<Readonly<Record<string, string>>>(choices).toMatchObject({
      'boost:1:ancestry:0': 'wis',
      'boost:1:background:0': 'wis',
      'boost:1:background:1': 'con',
      'boost:10:free:3': 'dex',
    });
    expect(report.unplacedBoosts).toStrictEqual([]);
    expect(report.modifierDifferences).toStrictEqual([]);
    expect(repository.audits).toStrictEqual([{ actor: amiri, command: CharacterCommand.ImportPathbuilder }]);
  });

  test('writes the voluntary flaws as picks; the modifiers they lower come out as Pathbuilder scored them', async () => {
    const { build } = briarRoseExport;
    const { abilities } = build;
    const flawed = {
      ...briarRoseExport,
      build: {
        ...build,
        abilities: {
          ...abilities,
          str: abilities.str - 2,
          cha: abilities.cha - 2,
          breakdown: { ...abilities.breakdown, ancestryFlaws: ['Str', 'Cha'] },
        },
      },
    };
    const briar = importerOver(briarContent(), repository);
    const { character, report } = await briar.importPathbuilder(amiri, flawed);
    expect<Readonly<Record<string, string>>>(character.document.build.choices).toMatchObject({
      'flaw:1:ancestry:0': 'str',
      'flaw:1:ancestry:1': 'cha',
    });
    expect(report.modifierDifferences).toStrictEqual([]);
  });

  test('an ancestry that is not loaded is refused by name and nothing is saved', async () => {
    const error = await rejection(service.importPathbuilder(amiri, briarRoseExport));
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues).toStrictEqual([
      {
        path: ['build', 'ancestry'],
        message: { key: 'character.validation.unmatchedAncestry', params: { ancestry: 'Goloma' } },
      },
    ]);
    expect(await characters.list(amiri, byName)).toStrictEqual([]);
    expect(repository.audits).toStrictEqual([]);
  });

  test.each([
    ['text that is not JSON', 'not json', 'character.import.problem.malformed'],
    ['JSON that is not an export', { hello: 'world' }, 'character.import.problem.malformed'],
    [
      'an export Pathbuilder marked failed',
      { ...mordredExport, success: false },
      'character.import.problem.exportFailed',
    ],
  ])('%s is refused and nothing is saved', async (_label, raw, key) => {
    const error = await rejection(service.importPathbuilder(amiri, raw));
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues[0]).toStrictEqual({ path: [], message: { key } });
    expect(repository.audits).toStrictEqual([]);
  });
});
