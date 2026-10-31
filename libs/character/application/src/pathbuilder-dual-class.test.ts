import { describe, expect, test } from 'bun:test';

import { BoostSource, CLASS_SLOT, SECOND_CLASS_SLOT } from '@pioneer/character/domain';
import type { Character, CharacterVariantRule } from '@pioneer/character/domain';
import { ImportKind, Occurrences, PathbuilderName, UnmatchedReason } from '@pioneer/interop/pathbuilder';
import type { CharacterImportReport, UnmatchedName } from '@pioneer/interop/pathbuilder';
import { mordredExport } from '@pioneer/interop/pathbuilder/testing';
import { Attribute, ChoiceValue, ContentKind, SlotKey, VariantRuleId, VariantStructure } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemoryCharacterVariantRepository } from './in-memory-character-variant-repository';
import { PathbuilderImportService } from './pathbuilder-import-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-07T10:00:00Z');

/** Mordred's human changeling, with the champion and oracle his dual class names loaded, and the Dual Class variant. */
function mordredPack(classes: readonly string[]): ContentPackBuilder {
  const all = Object.values(Attribute);
  const pack = new ContentPackBuilder()
    .withId('player-core')
    .withAncestry('human', { boosts: [all] })
    .withHeritage('changeling', 'human')
    .withBackground('cursed', [['cha', 'str'], all])
    .withVariantRule('dual-class', [VariantStructure.SecondClass]);
  return classes.includes('champion') ? pack.withClass('champion', ['str', 'dex']).withClass('oracle', ['cha']) : pack;
}

const oracle = PathbuilderName.parse('Oracle');

/** The class names an import left behind, if any. */
function unmatchedClasses(report: CharacterImportReport): readonly UnmatchedName[] | undefined {
  return report.unmatched.find((group) => group.kind === ImportKind.Class)?.names;
}

/** Mordred as imported, and the variant rules the import enabled. */
interface MordredImport {
  readonly character: Character;
  readonly report: CharacterImportReport;
  readonly enabled: readonly CharacterVariantRule[];
}

/** Mordred imported over `pack`. */
async function importMordred(pack: ContentPackBuilder): Promise<MordredImport> {
  const variants = new InMemoryCharacterVariantRepository();
  const characters = new InMemoryCharacterRepository();
  const importer = new PathbuilderImportService({ characters, content: fixedContent(pack.build()), variants }, clock);
  const { character, report } = await importer.importPathbuilder(amiri, mordredExport);
  return { character, report, enabled: await variants.listForCharacter(character.id) };
}

describe('PathbuilderImportService.importPathbuilder: a dual class', () => {
  test('puts the second class in its slot, its key attribute boost in a set of its own, and enables the variant', async () => {
    const pack = mordredPack(['champion', 'oracle']);
    const { character, report, enabled } = await importMordred(pack);
    const { choices } = character.document.build;
    expect(choices[CLASS_SLOT]).toBe(ChoiceValue.parse(pack.idOf(ContentKind.Class, 'champion')));
    expect(choices[SECOND_CLASS_SLOT]).toBe(ChoiceValue.parse(pack.idOf(ContentKind.Class, 'oracle')));
    expect(choices[SlotKey.parse('boost:1:class:0')]).toBe(ChoiceValue.parse('str'));
    expect(report.unplacedBoosts.filter((boost) => boost.source === BoostSource.SecondClass)).toStrictEqual([]);
    expect(unmatchedClasses(report)).toBeUndefined();
    const dualClass = VariantRuleId.parse(pack.idOf(ContentKind.VariantRule, 'dual-class'));
    expect(enabled.map((rule) => rule.variantId)).toStrictEqual([dualClass]);
    expect(enabled.map((rule) => rule.enabledBy)).toStrictEqual([amiri]);
  });

  test('says the second class was not offered, and enables nothing, when no pack defines the variant', async () => {
    const bare = new ContentPackBuilder()
      .withId('player-core')
      .withAncestry('human')
      .withBackground('cursed', [['cha', 'str']])
      .withClass('champion', ['str', 'dex'])
      .withClass('oracle', ['cha']);
    const { character, report, enabled } = await importMordred(bare);
    expect(Object.keys(character.document.build.choices)).not.toContain(SECOND_CLASS_SLOT);
    expect(unmatchedClasses(report)).toStrictEqual([
      { name: oracle, occurrences: Occurrences.parse(1), reason: UnmatchedReason.NotOffered },
    ]);
    expect(enabled).toStrictEqual([]);
  });

  test('says the second class is unmatched, and enables nothing, when no loaded class has its name', async () => {
    const { character, report, enabled } = await importMordred(mordredPack([]).withClass('champion', ['str', 'dex']));
    expect(Object.keys(character.document.build.choices)).not.toContain(SECOND_CLASS_SLOT);
    expect(unmatchedClasses(report)).toStrictEqual([
      { name: oracle, occurrences: Occurrences.parse(1), reason: UnmatchedReason.Unmatched },
    ]);
    expect(enabled).toStrictEqual([]);
  });
});
