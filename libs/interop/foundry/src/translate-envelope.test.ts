import { describe, expect, test } from 'bun:test';

import {
  BookId,
  ContentId,
  contentId,
  ContentLevel,
  ContentText,
  EntrySlug,
  ExternalId,
  PackId,
  RuleElement,
  Trait,
} from '@pioneer/rules/sdk';

import { translationReport } from './dry-run-report';
import { FoundryDocument, FoundryItemType } from './foundry-document';
import type { FoundryPack } from './foundry-release';
import type { ImportedEnvelope } from './imported-envelope';
import type { SelectedEntry } from './select-entries';
import { EnvelopeFailureReason, translateEnvelopes } from './translate-envelope';
import type { EnvelopeContext, EnvelopeTranslation } from './translate-envelope';

const playerCore = BookId.parse('player-core');
const pack = PackId.parse('player-core');
const feats: FoundryPack = { name: 'feats-srd', directory: 'feats' };
const context: EnvelopeContext = {
  pack,
  traits: new Set(['general', 'skill'].map((trait) => Trait.parse(trait))),
  lang: {},
};

const remaster = { title: 'Pathfinder Player Core', license: 'ORC', remaster: true };

function selected(system: object, name = 'Toughness', documentId = 'AmP0qu7c5dlBSath'): SelectedEntry {
  const document = FoundryDocument.parse({
    _id: documentId,
    name,
    type: 'feat',
    system: { publication: remaster, ...system },
  });
  return {
    pack: feats,
    path: `packs/pf2e/feats/${documentId}.json`,
    document,
    type: FoundryItemType.Feat,
    book: playerCore,
  };
}

function translateOne(system: object, name?: string): EnvelopeTranslation {
  return translateEnvelopes([selected(system, name)], context);
}

function envelopeOf(system: object, name?: string): ImportedEnvelope | undefined {
  return translateOne(system, name).entries[0]?.envelope;
}

const toughnessId = ContentId.parse(contentId(pack, EntrySlug.parse('feat:toughness')));

describe('translateEnvelopes: address', () => {
  test('id is UUIDv5 of <pack>/<slug>, slug the kind and the sluggified name', () => {
    const envelope = envelopeOf({}, 'Champion’s Reaction');

    const slug = EntrySlug.parse('feat:champions-reaction');

    expect(envelope?.slug).toBe(slug);
    expect(envelope?.id).toBe(ContentId.parse(contentId(pack, slug)));
    expect(envelope?.pack).toBe(pack);
  });

  test("Foundry's own slug wins over the name", () => {
    expect(envelopeOf({ slug: 'power-attack' }, 'Power Attack (Fighter)')?.slug).toBe(
      EntrySlug.parse('feat:power-attack'),
    );
  });

  test('externalIds.foundry is the compendium UUID', () => {
    expect(envelopeOf({})?.externalIds.foundry).toBe(
      ExternalId.parse('Compendium.pf2e.feats-srd.Item.AmP0qu7c5dlBSath'),
    );
  });

  test('folds diacritics into an ASCII slug', () => {
    expect(envelopeOf({}, 'Déjà Vu')?.slug).toBe(EntrySlug.parse('feat:deja-vu'));
  });

  test('fails a slug that is not a Pioneer slug even folded', () => {
    const { entries, failures } = translateOne({}, 'Ωmega');

    expect(entries).toEqual([]);
    expect(failures).toMatchObject([{ reason: EnvelopeFailureReason.InvalidSlug, detail: 'feat:ωmega' }]);
  });

  test('fails the later of two documents of one kind with one name, keeping the document', () => {
    const { entries, failures } = translateEnvelopes(
      [selected({}, 'Shield', 'first'), selected({}, 'Shield', 'second')],
      context,
    );

    expect(entries.map(({ source }) => source.path)).toEqual(['packs/pf2e/feats/first.json']);
    expect(failures).toMatchObject([
      {
        path: 'packs/pf2e/feats/second.json',
        document: { _id: 'second' },
        reason: EnvelopeFailureReason.DuplicateSlug,
        detail: 'feat:shield',
      },
    ]);
  });
});

function ofType(name: string, type: FoundryItemType, directory: string): SelectedEntry {
  const document = FoundryDocument.parse({ _id: `${directory}Id`, name, type, system: { publication: remaster } });
  return {
    pack: { name: `${directory}-srd`, directory },
    path: `packs/pf2e/${directory}/fly.json`,
    document,
    type,
    book: playerCore,
  };
}

describe('translateEnvelopes: one name in two kinds', () => {
  test('is two slugs, each naming its kind', () => {
    const spell = ofType('Fly', FoundryItemType.Spell, 'spells');
    const action = ofType('Fly', FoundryItemType.Action, 'actions');
    const { entries, failures } = translateEnvelopes([spell, action], context);

    expect(failures).toEqual([]);
    expect(entries.map(({ source, envelope }) => `${source.type} ${envelope.slug}`)).toEqual([
      'spell spell:fly',
      'action action:fly',
    ]);
  });
});

describe('translateEnvelopes: name, level and rarity', () => {
  test('name is the document name', () => {
    expect(envelopeOf({})?.name).toBe(ContentText.parse('Toughness'));
  });

  test('fails an empty name', () => {
    expect(translateOne({ slug: 'nameless' }, '').failures).toMatchObject([
      { reason: EnvelopeFailureReason.InvalidName },
    ]);
  });

  test('level is system.level.value, absent when Foundry has none', () => {
    expect(envelopeOf({ level: { value: 0 } })?.level).toBe(ContentLevel.parse(0));
    expect(envelopeOf({ level: { value: 5 } })?.level).toBe(ContentLevel.parse(5));
    expect(envelopeOf({})).not.toHaveProperty('level');
  });

  test.each([-1, 31, 1.5])('fails level %p', (value) => {
    expect(translateOne({ level: { value } }).failures).toMatchObject([
      { reason: EnvelopeFailureReason.InvalidLevel, detail: String(value) },
    ]);
  });

  test('rarity is system.traits.rarity, common without one', () => {
    expect(envelopeOf({ traits: { value: [], rarity: 'uncommon' } })?.rarity).toBe('uncommon');
    expect(envelopeOf({ traits: { value: [] } })?.rarity).toBe('common');
    expect(envelopeOf({})?.rarity).toBe('common');
  });

  test('fails an unknown rarity', () => {
    expect(translateOne({ traits: { value: [], rarity: 'legendary' } }).failures).toMatchObject([
      { reason: EnvelopeFailureReason.InvalidRarity, detail: 'legendary' },
    ]);
  });
});

describe('translateEnvelopes: traits', () => {
  test('keeps traits, reporting those outside the vocabulary', () => {
    const { entries, unknownTraits } = translateOne({ traits: { value: ['general', 'skill', 'fortune'] } });

    expect(entries[0]?.envelope.traits).toEqual(['general', 'skill', 'fortune'].map((trait) => Trait.parse(trait)));
    expect(unknownTraits).toEqual([{ entry: toughnessId, trait: 'fortune' }]);
  });

  test('drops and reports a trait that is not a slug, and repeats only once', () => {
    const { entries, unknownTraits } = translateOne({ traits: { value: ['general', 'Bad Trait', 'general'] } });

    expect(entries[0]?.envelope.traits).toEqual([Trait.parse('general')]);
    expect(unknownTraits).toEqual([{ entry: toughnessId, trait: 'Bad Trait' }]);
  });
});

describe('translateEnvelopes: sources and placeholders', () => {
  test('sources are the selected book, without page or AoN link', () => {
    expect(envelopeOf({})?.sources).toEqual([{ kind: 'book', book: playerCore }]);
  });

  test('there is no supersedes', () => {
    expect(envelopeOf({})).not.toHaveProperty('supersedes');
  });
});

describe('translateEnvelopes: description', () => {
  test('is the HTML description as rich text', () => {
    const envelope = envelopeOf({ description: { value: '<p>You gain <strong>3</strong> Hit Points.</p>' } });

    const description: unknown = envelope?.description;

    expect(description).toEqual([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'You gain ' },
          { type: 'text', text: '3', marks: ['strong'] },
          { type: 'text', text: ' Hit Points.' },
        ],
      },
    ]);
  });

  test('is empty when the document has none', () => {
    expect(envelopeOf({})?.description).toEqual([]);
  });

  test('reports markup it keeps only the text of, against the entry', () => {
    const { unknownMarkup } = translateOne({
      description: { value: '<p>Stride <span style="float:right">1</span></p>' },
    });

    expect(unknownMarkup).toEqual([
      { entry: toughnessId, markup: 'span[style]' },
      { entry: toughnessId, markup: 'span' },
    ]);
  });
});

describe('translateEnvelopes: rule elements', () => {
  const pioneerShaped = { key: 'FlatModifier', selectors: ['ac'], type: 'circumstance', value: 2 };
  const foundryShaped = { key: 'FlatModifier', selector: 'hp', value: '@actor.level', requiresEquipped: false };
  const unknownKey = { key: 'ActiveEffectLike', mode: 'subtract', path: 'system.attributes.dying.recoveryDC' };

  test('keeps elements RuleElement reads and reports the rest with entry, key and raw JSON', () => {
    const { entries, untranslatedRules } = translateOne({ rules: [pioneerShaped, foundryShaped, unknownKey, 'x'] });

    expect(entries[0]?.envelope.rules).toEqual([RuleElement.parse(pioneerShaped)]);
    expect(untranslatedRules).toEqual([
      { entry: toughnessId, key: 'FlatModifier', raw: foundryShaped },
      { entry: toughnessId, key: 'ActiveEffectLike', raw: unknownKey },
      { entry: toughnessId, key: '', raw: 'x' },
    ]);
  });

  test('translates Foundry reference paths in a formula value', () => {
    const element = { key: 'FlatModifier', selectors: ['ac'], type: 'untyped', value: '@actor.level' };

    expect(envelopeOf({ rules: [element] })?.rules).toEqual([RuleElement.parse({ ...element, value: '@level' })]);
  });

  test('imports the entry without any rule elements when none translate', () => {
    const { entries } = translateOne({ rules: [foundryShaped] });

    expect(entries[0]?.envelope.rules).toEqual([]);
  });
});

describe('translationReport', () => {
  test('counts envelopes, failures, rule element keys, traits, markup and lang keys, most frequent first', () => {
    const foundryShaped = { key: 'FlatModifier', selector: 'hp', value: 1, removeAfterRoll: true };
    const translation = translateEnvelopes(
      [
        selected(
          { traits: { value: ['fortune', 'mental'] }, rules: [foundryShaped, { key: 'Note', text: 'PF2E.Nope' }] },
          'One',
          'a',
        ),
        selected(
          { traits: { value: ['fortune'] }, rules: [foundryShaped], description: { value: '<div>Hi</div>' } },
          'Two',
          'b',
        ),
        selected({}, 'Two', 'c'),
      ],
      context,
    );

    expect(translationReport(translation)).toEqual({
      entries: 2,
      failures: [{ key: EnvelopeFailureReason.DuplicateSlug, count: 1 }],
      untranslatedRules: [
        { key: 'FlatModifier', count: 2 },
        { key: 'Note', count: 1 },
      ],
      droppedRules: [],
      unknownTraits: [
        { key: 'fortune', count: 2 },
        { key: 'mental', count: 1 },
      ],
      unknownMarkup: [{ key: 'div', count: 1 }],
      untranslatedEnrichers: [],
      unresolvedText: [{ key: 'missing-key PF2E.Nope', count: 1 }],
    });
  });
});
