import { describe, expect, test } from 'bun:test';

import { BookId, ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { describeEntries } from './describe-entries';
import { entrySlugOf } from './entry-slugs';
import { FoundryDocument, FoundryItemType } from './foundry-document';
import type { LinkedEntry } from './foundry-links';
import type { FoundryPack, PackDocument } from './foundry-release';

const pack = PackId.parse('player-core');
const playerCore = BookId.parse('player-core');
const actions: FoundryPack = { name: 'actionspf2e', directory: 'actions' };
const conditions: FoundryPack = { name: 'conditionitems', directory: 'conditions' };
const effects: FoundryPack = { name: 'feat-effects', directory: 'feat-effects' };
const remaster = { title: 'Pathfinder Player Core', license: 'ORC', remaster: true };

/** Primal Howl as Foundry pf2e 8.6.0 has it: an area, damage, a basic save, conditions and a link to itself. */
const PRIMAL_HOWL =
  '<p><strong>Frequency</strong> once per hour</p><hr /><p><strong>Effect</strong> Your animal companion screeches ' +
  'and howls, empowered with natural magic. All creatures in a @Template[cone|distance:30] take ' +
  '@Damage[(floor(@actor.level/2))d6[sonic]|options:area-damage] damage for every 2 levels your companion has, ' +
  'with a @Check[fortitude|against:spell|basic|options:area-effect] save against your spell DC. Creatures that ' +
  'fail become @UUID[Compendium.pf2e.conditionitems.Item.Frightened]{Frightened 1}, and creatures that critically ' +
  'fail become @UUID[Compendium.pf2e.conditionitems.Item.Frightened]{Frightened 2}.</p>\n<p>It gains the ' +
  '@UUID[Compendium.pf2e.actionspf2e.Item.Primal Howl] advanced maneuver, and the ' +
  '@UUID[Compendium.pf2e.feat-effects.Item.howlEffect000001] <span class="action-glyph">A</span>.</p>' +
  '<p>[[/act primal-howl]] [[/act grapple]] @UUID[Compendium.pf2e.conditionitems.Item.TBSHQspnbcqxsmjL]</p>';

function documentOf(foundryPack: FoundryPack, documentId: string, document: object): PackDocument {
  const parsed = FoundryDocument.parse({ _id: documentId, system: { publication: remaster }, ...document });
  return { pack: foundryPack, path: `packs/pf2e/${foundryPack.directory}/${documentId}.json`, document: parsed };
}

function linked(document: PackDocument, type: FoundryItemType): LinkedEntry {
  const source = { ...document, type, book: playerCore };
  const slug = EntrySlug.parse(entrySlugOf(source));
  return { source, id: ContentId.parse(contentId(pack, slug)) };
}

const frightened = documentOf(conditions, 'TBSHQspnbcqxsmjL', {
  name: 'Frightened',
  type: 'condition',
});
const primalHowl = documentOf(actions, 'wnZhAUiYcs2mv8sZ', {
  name: 'Primal Howl',
  type: 'action',
  system: { publication: remaster, description: { value: PRIMAL_HOWL } },
});
const howlEffect = documentOf(effects, 'howlEffect000001', {
  name: 'Effect: Primal Howl',
  type: 'effect',
});

describe('describeEntries', () => {
  test('a description with mixed enrichers rounds to the expected nodes, links resolved by id, name and action slug', () => {
    const howl = linked(primalHowl, FoundryItemType.Action);
    const condition = linked(frightened, FoundryItemType.Condition);

    const { descriptions, untranslatedEnrichers } = describeEntries(
      [howl, condition],
      [primalHowl, frightened, howlEffect],
      {},
    );

    const description: unknown = descriptions.get(howl.id);

    expect(description).toEqual([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Frequency', marks: ['strong'] },
          { type: 'text', text: ' once per hour' },
        ],
      },
      { type: 'rule' },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Effect', marks: ['strong'] },
          {
            type: 'text',
            text: ' Your animal companion screeches and howls, empowered with natural magic. All creatures in a ',
          },
          { type: 'template', shape: 'cone', size: 30 },
          { type: 'text', text: ' take ' },
          { type: 'damage', instances: [{ formula: '(floor(@level/2))d6', damageType: 'sonic' }] },
          { type: 'text', text: ' damage for every 2 levels your companion has, with a ' },
          { type: 'check', statistic: 'save:fortitude', dc: { against: 'spell-dc' }, basic: true },
          { type: 'text', text: ' save against your spell DC. Creatures that fail become ' },
          { type: 'ref', id: condition.id, label: 'Frightened 1' },
          { type: 'text', text: ', and creatures that critically fail become ' },
          { type: 'ref', id: condition.id, label: 'Frightened 2' },
          { type: 'text', text: '.' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'It gains the ' },
          { type: 'ref', id: howl.id },
          { type: 'text', text: ' advanced maneuver, and the Effect: Primal Howl ' },
          { type: 'action-cost', cost: 'one' },
          { type: 'text', text: '.' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'ref', id: howl.id },
          { type: 'text', text: ' grapple ' },
          { type: 'ref', id: condition.id },
        ],
      },
    ]);
    expect(untranslatedEnrichers.map(({ enricher }) => enricher)).toEqual([
      '@Damage[options]',
      '@Check[options]',
      '@UUID[feat-effects]',
      '[[/act]]',
    ]);
  });

  test('without the release, a link outside the import reads as its label', () => {
    const condition = linked(frightened, FoundryItemType.Condition);
    const linking = documentOf(actions, 'linking000000001', {
      name: 'Linking',
      type: 'action',
      system: {
        publication: remaster,
        description: { value: '<p>@UUID[Compendium.pf2e.spells-srd.Item.abcdefghijklmnop]{Fear}</p>' },
      },
    });
    const entry = linked(linking, FoundryItemType.Action);

    const description: unknown = describeEntries([entry, condition], [], {}).descriptions.get(entry.id);

    expect(description).toEqual([{ type: 'paragraph', content: [{ type: 'text', text: 'Fear' }] }]);
  });
});
