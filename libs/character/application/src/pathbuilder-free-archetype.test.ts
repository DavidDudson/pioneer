import { describe, expect, test } from 'bun:test';

import type { Character, CharacterVariantRule } from '@pioneer/character/domain';
import { ImportKind, UnmatchedReason } from '@pioneer/interop/pathbuilder';
import type { CharacterImportReport } from '@pioneer/interop/pathbuilder';
import { mordredExport } from '@pioneer/interop/pathbuilder/testing';
import { Attribute, ContentKind, SlotKey, VariantRuleId, VariantStructure } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemoryCharacterVariantRepository } from './in-memory-character-variant-repository';
import { PathbuilderImportService } from './pathbuilder-import-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-07T10:00:00Z');

/** Free Archetype's feat slot at `level`, as the core rules pack writes it. */
function freeArchetypeSlot(level: number): object[] {
  const flag = `free-archetype-${level}`;
  const predicate = [{ gte: ['self:level', level] }];
  return [
    {
      key: 'ChoiceSet',
      flag,
      prompt: 'Free archetype feat',
      choices: { kind: 'feat', filter: ['item:trait:archetype', { lte: ['item:level', 'self:level'] }] },
      predicate,
    },
    { key: 'GrantItem', item: { choice: flag }, predicate },
  ];
}

const SLOT_LEVELS = [2, 4, 6, 8, 10, 12];

/** Mordred's human, with his champion and oracle and the Sorcerer Dedication his Free Archetype slot at 2 holds. */
function mordredPack(variant: boolean): ContentPackBuilder {
  const all = Object.values(Attribute);
  const pack = new ContentPackBuilder()
    .withId('player-core')
    .withAncestry('human', { boosts: [all] })
    .withHeritage('changeling', 'human')
    .withBackground('cursed', [['cha', 'str'], all])
    .withClass('champion', ['str', 'dex'])
    .withClass('oracle', ['cha'])
    .withFeat('sorcerer-dedication', { level: 2, traits: ['archetype', 'dedication'] });
  return variant
    ? pack.withVariantRuleElements(
        'free-archetype',
        [VariantStructure.ExtraSlots],
        SLOT_LEVELS.flatMap((level) => freeArchetypeSlot(level)),
      )
    : pack;
}

/** Mordred as imported, and the variant rules the import enabled. */
interface MordredImport {
  readonly character: Character;
  readonly report: CharacterImportReport;
  readonly enabled: readonly CharacterVariantRule[];
}

async function importMordred(pack: ContentPackBuilder): Promise<MordredImport> {
  const variants = new InMemoryCharacterVariantRepository();
  const characters = new InMemoryCharacterRepository();
  const importer = new PathbuilderImportService({ characters, content: fixedContent(pack.build()), variants }, clock);
  const { character, report } = await importer.importPathbuilder(amiri, mordredExport);
  return { character, report, enabled: await variants.listForCharacter(character.id) };
}

/** The feat names an import left behind, by reason. */
function leftBehind(report: CharacterImportReport, reason: UnmatchedReason): string[] {
  const feats = report.unmatched.find((group) => group.kind === ImportKind.Feat)?.names ?? [];
  return feats.filter((feat) => feat.reason === reason).map((feat) => feat.name);
}

describe('PathbuilderImportService.importPathbuilder: Free Archetype', () => {
  test('puts a "Free Archetype 2" feat in the variant slot and enables the variant', async () => {
    const pack = mordredPack(true);
    const { character, report, enabled } = await importMordred(pack);
    const dedication = pack.idOf(ContentKind.Feat, 'sorcerer-dedication');
    const variant = VariantRuleId.parse(pack.idOf(ContentKind.VariantRule, 'free-archetype'));
    expect(enabled.map((rule) => rule.variantId)).toStrictEqual([variant]);
    expect(character.document.build.choices[SlotKey.parse(`${variant}:0`)]).toBe(dedication);
    expect(leftBehind(report, UnmatchedReason.NotOffered)).not.toContain('Sorcerer Dedication');
  });

  test('names the feat as not offered, and enables nothing, when no pack defines the variant', async () => {
    const pack = mordredPack(false);
    const { character, report, enabled } = await importMordred(pack);
    expect(enabled).toStrictEqual([]);
    expect(Object.values(character.document.build.choices)).not.toContain(
      pack.idOf(ContentKind.Feat, 'sorcerer-dedication'),
    );
    expect(leftBehind(report, UnmatchedReason.NotOffered)).toContain('Sorcerer Dedication');
  });
});
