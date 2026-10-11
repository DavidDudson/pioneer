import { describe, expect, test } from 'bun:test';

import {
  BookId,
  ContentId,
  contentId,
  ContentLevel,
  ContentText,
  ExternalId,
  PackId,
  RuleElement,
  Slug,
  Trait,
} from '@pioneer/rules/sdk';

import { translationReport } from './dry-run-report';
import { FoundryDocument, FoundryItemType } from './foundry-document';
import type { FoundryPack } from './foundry-release';
import type { SelectedEntry } from './select-entries';
import { EnvelopeFailureReason, translateEnvelopes } from './translate-envelope';
import type { EnvelopeContext, EnvelopeTranslation, ImportedEnvelope } from './translate-envelope';

const playerCore = BookId.parse('player-core');
const pack = PackId.parse('player-core');
const feats: FoundryPack = { name: 'feats-srd', directory: 'feats' };
const context: EnvelopeContext = { pack, traits: new Set(['general', 'skill'].map((trait) => Trait.parse(trait))) };

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

const toughnessId = ContentId.parse(contentId(pack, Slug.parse('toughness')));

describe('translateEnvelopes: address', () => {
  test('id is UUIDv5 of <pack>/<slug>, slug sluggified from the name', () => {
    const envelope = envelopeOf({}, 'Champion’s Reaction');

    const slug = Slug.parse('champions-reaction');

    expect(envelope?.slug).toBe(slug);
    expect(envelope?.id).toBe(ContentId.parse(contentId(pack, slug)));
    expect(envelope?.pack).toBe(pack);
  });

  test("Foundry's own slug wins over the name", () => {
    expect(envelopeOf({ slug: 'power-attack' }, 'Power Attack (Fighter)')?.slug).toBe(Slug.parse('power-attack'));
  });

  test('externalIds.foundry is the compendium UUID', () => {
    expect(envelopeOf({})?.externalIds.foundry).toBe(
      ExternalId.parse('Compendium.pf2e.feats-srd.Item.AmP0qu7c5dlBSath'),
    );
  });

  test('fails a slug that is not a Pioneer slug', () => {
    const { entries, failures } = translateOne({}, 'Élan');

    expect(entries).toEqual([]);
    expect(failures).toMatchObject([{ reason: EnvelopeFailureReason.InvalidSlug, detail: 'élan' }]);
  });

  test('fails the later of two documents with one slug, keeping the first', () => {
    const { entries, failures } = translateEnvelopes(
      [selected({}, 'Shield', 'first'), selected({}, 'Shield', 'second')],
      context,
    );

    expect(entries.map(({ source }) => source.path)).toEqual(['packs/pf2e/feats/first.json']);
    expect(failures).toMatchObject([
      { path: 'packs/pf2e/feats/second.json', reason: EnvelopeFailureReason.DuplicateSlug, detail: 'shield' },
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

  test('description is empty and there is no supersedes', () => {
    const envelope = envelopeOf({});

    expect(envelope?.description).toEqual([]);
    expect(envelope).not.toHaveProperty('supersedes');
  });
});

describe('translateEnvelopes: rule elements', () => {
  const pioneerShaped = { key: 'FlatModifier', selectors: ['ac'], type: 'circumstance', value: 2 };
  const foundryShaped = { key: 'FlatModifier', selector: 'hp', value: '@actor.level' };
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
  test('counts envelopes, failures, rule element keys and traits, most frequent first', () => {
    const foundryShaped = { key: 'FlatModifier', selector: 'hp', value: 1 };
    const translation = translateEnvelopes(
      [
        selected({ traits: { value: ['fortune', 'mental'] }, rules: [foundryShaped, { key: 'Note' }] }, 'One', 'a'),
        selected({ traits: { value: ['fortune'] }, rules: [foundryShaped] }, 'Two', 'b'),
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
      unknownTraits: [
        { key: 'fortune', count: 2 },
        { key: 'mental', count: 1 },
      ],
    });
  });
});
