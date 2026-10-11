import { describe, expect, test } from 'bun:test';

import { ContentKind, InlineKind, RuleElementKey } from '@pioneer/rules/sdk';

import { BacklogGapType, BacklogItemType, LeftOutReason, stripArt } from './import-backlog';
import type { BacklogGap, BacklogItem } from './import-backlog';
import { packFiles, packOutput } from './pack-output';
import { coreRules, idOf, known, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import { AID, RAISE_A_SHIELD, SHIELD_RAISED } from './testing/kind-fixtures';
import { EnvelopeFailureReason } from './translate-envelope';
import type { ImportTranslation } from './translate-import';

function feat(id: string, name: string, system: object = {}): DocumentFixture {
  return {
    id,
    name,
    type: 'feat',
    system: { category: 'general', level: { value: 1 }, actionType: { value: 'passive' }, ...system },
  };
}

const GRANTED = feat('grantedFeat00001', 'Granted');
const GRANT = { key: 'GrantItem', uuid: 'Compendium.pf2e.feats-srd.Item.grantedFeat00001' };
const GRANTER = feat('granterFeat00001', 'Granter', {
  rules: [GRANT],
  description: { value: '<p>See @UUID[Compendium.pf2e.feats-srd.Item.grantedFeat00001].</p>' },
});

const context = { known };

function slugsOf(translation: ImportTranslation): readonly string[] {
  return packOutput(translation, context).entries.map(({ pack, slug }) => `${pack}/${slug}`);
}

/** `translation` as if the entry with `slug` had no kind data, as one whose kind has no translator. */
function withoutData(translation: ImportTranslation, slug: string): ImportTranslation {
  return {
    ...translation,
    entries: translation.entries.map((entry) =>
      entry.envelope.slug === slug ? { source: entry.source, envelope: entry.envelope } : entry,
    ),
  };
}

/** `translation` with every entry citing no source, which `ContentEntry` rejects. */
function unsourced(translation: ImportTranslation): ImportTranslation {
  return {
    ...translation,
    entries: translation.entries.map((entry) => {
      const copy = structuredClone(entry);
      Object.assign(copy.envelope, { sources: [] });
      return copy;
    }),
  };
}

function entryItem(backlog: readonly BacklogItem[], slug: string): BacklogItem | undefined {
  return backlog.find((item) => item.type === BacklogItemType.Entry && item.slug === slug);
}

function gapsOf(backlog: readonly BacklogItem[], slug: string): readonly BacklogGap[] {
  const item = entryItem(backlog, slug);
  return item?.type === BacklogItemType.Entry ? item.gaps : [];
}

describe('packOutput: entries', () => {
  test('are sorted by pack, kind and slug, the vocabulary they use in its own pack', () => {
    const slugs = slugsOf(translate([SHIELD_RAISED, RAISE_A_SHIELD, AID]));

    expect(slugs.filter((slug) => slug.startsWith('player-core/'))).toEqual([
      'player-core/action:aid',
      'player-core/action:raise-a-shield',
      'player-core/effect:effect-raise-a-shield',
    ]);
    expect(slugs.filter((slug) => slug.startsWith(`${coreRules}/`))).toEqual(
      slugs.filter((slug) => slug.startsWith(`${coreRules}/`)).toSorted(),
    );
    expect(slugs[0]?.startsWith(`${coreRules}/`)).toBe(true);
  });

  test('have the key order of a content entry, so a re-run is a clean diff', () => {
    const { entries } = packOutput(translate([AID]), context);
    const aid = entries.find(({ kind }) => kind === ContentKind.Action);

    expect(Object.keys({ ...aid }).slice(0, 5)).toEqual(['id', 'pack', 'kind', 'slug', 'name']);
  });

  test('are the same whatever order the documents come in', () => {
    const documents = [SHIELD_RAISED, RAISE_A_SHIELD, AID, GRANTED, GRANTER];
    const forwards = packOutput(translate(documents), context);
    const backwards = packOutput(translate(documents.toReversed()), context);

    expect(JSON.stringify(backwards)).toBe(JSON.stringify(forwards));
  });
});

describe('packOutput: entries left out', () => {
  test('an entry with no kind data is left out, with its document', () => {
    const { entries, backlog } = packOutput(withoutData(translate([AID]), 'action:aid'), context);

    expect(entries.some(({ slug }) => slug === 'action:aid')).toBe(false);
    expect(entryItem(backlog, 'action:aid')).toMatchObject({
      leftOut: { reason: LeftOutReason.NoKindData, detail: '' },
      foundry: 'Compendium.pf2e.actionspf2e.Item.HCl3pzVefiv9ZKQW',
      document: { _id: AID.id, name: 'Aid' },
    });
  });

  test('an entry the schema rejects is left out, naming the first issue', () => {
    const { backlog } = packOutput(unsourced(translate([AID])), context);

    expect(entryItem(backlog, 'action:aid')).toMatchObject({
      leftOut: { reason: LeftOutReason.InvalidEntry, detail: 'sources: Too small: expected array to have >=1 items' },
    });
  });

  test('data that references an entry left out leaves its entry out too', () => {
    const translation = withoutData(translate([RAISE_A_SHIELD, SHIELD_RAISED]), 'effect:effect-raise-a-shield');
    const { entries, backlog } = packOutput(translation, context);

    expect(entries.some(({ slug }) => slug === 'action:raise-a-shield')).toBe(false);
    expect(entryItem(backlog, 'action:raise-a-shield')).toMatchObject({
      leftOut: {
        reason: LeftOutReason.UnresolvedReference,
        detail: 'player-core/effect:effect-raise-a-shield',
      },
    });
  });
});

describe('packOutput: references to an entry left out', () => {
  const translation = withoutData(translate([GRANTED, GRANTER]), 'feat:granted');
  const { entries, backlog } = packOutput(translation, context);
  const granter = entries.find(({ slug }) => slug === 'feat:granter');

  test('a rule element is dropped and reported; the entry stays, its keys in order', () => {
    const untouched = packOutput(translate([GRANTED, GRANTER]), context).entries.find(
      ({ slug }) => slug === 'feat:granter',
    );

    expect(Object.keys({ ...granter })).toEqual(Object.keys({ ...untouched }));
    expect(granter?.rules.some(({ key }) => key === RuleElementKey.GrantItem)).toBe(false);
    const references = gapsOf(backlog, 'feat:granter').filter(({ type }) => type === BacklogGapType.Reference);

    expect(references).toMatchObject([
      {
        type: BacklogGapType.Reference,
        entry: 'player-core/feat:granted',
        element: { key: RuleElementKey.GrantItem, item: idOf('feat:granted') },
      },
    ]);
  });

  test('a link in rich text becomes the target name as text', () => {
    expect(JSON.stringify(granter?.description)).not.toContain(idOf('feat:granted'));
    expect(granter?.description).toMatchObject([
      {
        type: 'paragraph',
        content: [
          { type: InlineKind.Text, text: 'See ' },
          { type: InlineKind.Text, text: 'Granted' },
          { type: InlineKind.Text, text: '.' },
        ],
      },
    ]);
    expect(gapsOf(backlog, 'feat:granter').filter(({ type }) => type === BacklogGapType.Link)).toMatchObject([
      { entry: 'player-core/feat:granted', element: { type: InlineKind.Ref, id: idOf('feat:granted') } },
    ]);
  });
});

describe('packOutput: backlog', () => {
  test("keeps an untranslated rule element's raw JSON, art stripped", () => {
    const image = { key: 'TokenImage', value: 'systems/pf2e/icons/token.webp', scale: 2 };
    const { backlog } = packOutput(translate([feat('imageFeat0000001', 'Image', { rules: [image] })]), context);

    expect(entryItem(backlog, 'feat:image')).toMatchObject({
      gaps: [{ type: BacklogGapType.Rule, key: 'TokenImage', raw: { key: 'TokenImage', scale: 2 } }],
    });
  });

  test('lists a document that yields no entry, and vocabulary that does not translate', () => {
    const twins = translate([feat('twinFeat00000001', 'Twin'), feat('twinFeat00000002', 'Twin')]);
    const { backlog } = packOutput(twins, context);

    expect(backlog.filter(({ type }) => type === BacklogItemType.Document)).toMatchObject([
      { foundry: 'Compendium.pf2e.feats-srd.Item.twinFeat00000002', reason: EnvelopeFailureReason.DuplicateSlug },
    ]);
    expect(backlog.filter(({ type }) => type === BacklogItemType.Vocabulary)).toMatchObject([
      { kind: ContentKind.DamageType, slug: 'untyped' },
    ]);
  });

  test('has no item for an entry that translated whole', () => {
    const { backlog } = packOutput(translate([AID]), context);

    expect(entryItem(backlog, 'action:aid')).toBeUndefined();
  });
});

describe('stripArt', () => {
  test('drops art keys and image paths at any depth, and nothing else', () => {
    expect(
      stripArt({
        img: 'icons/a.webp',
        name: 'Hat',
        rules: [{ key: 'TokenImage', value: 'a/b.PNG' }, 'c.svg', 'text'],
        token: { texture: { src: 'x' }, scale: 1 },
      }),
    ).toEqual({ name: 'Hat', rules: [{ key: 'TokenImage' }, 'text'], token: { scale: 1 } });
  });
});

describe('packFiles', () => {
  test('groups sorted entries into one file per pack and kind', () => {
    const { entries } = packOutput(translate([SHIELD_RAISED, RAISE_A_SHIELD, AID]), context);
    const files = packFiles(entries).filter(({ pack }) => pack !== coreRules);

    expect(files.map(({ pack, kind, entries: each }) => `${pack} ${kind} ${each.length}`)).toEqual([
      'player-core action 2',
      'player-core effect 1',
    ]);
  });
});
