import { slugName, SourceKind } from '@pioneer/rules/sdk';

import type { ImportedEnvelope } from '../imported-envelope';
import type { GapFields } from '../kind-data-gaps';
import type { ImportedEntry, ImportTranslation } from '../translate-import';
import type { ImportedKindData } from '../translate-kind-data';
import { playerCore, translate } from './import-fixtures';
import type { DocumentFixture } from './import-fixtures';

/** Fixture actions and conditions, shaped as `pf2e-8.6.0` has them, and helpers to read what the import made of them. */

/** Foundry writes `null` for an unset field; the fixtures keep it. */
export const FOUNDRY_NULL: unknown = JSON.parse('null');

export const RAISE_A_SHIELD: DocumentFixture = {
  id: 'xjGwis0uaC2305pm',
  name: 'Raise a Shield',
  type: 'action',
  system: {
    actionType: { value: 'action' },
    actions: { value: 1 },
    category: 'defensive',
    selfEffect: {
      name: 'Effect: Raise a Shield',
      uuid: 'Compendium.pf2e.equipment-effects.Item.Effect: Raise a Shield',
    },
    description: { value: '<p><strong>Requirements</strong> You are wielding a shield.</p><hr /><p>You raise it.</p>' },
  },
};

export const SHIELD_RAISED: DocumentFixture = {
  id: '2YRDYVnC1eljaXKK',
  name: 'Effect: Raise a Shield',
  type: 'effect',
  system: { duration: { expiry: 'turn-start', sustained: false, unit: 'rounds', value: 1 } },
};

export const AID: DocumentFixture = {
  id: 'HCl3pzVefiv9ZKQW',
  name: 'Aid',
  type: 'action',
  system: {
    actionType: { value: 'reaction' },
    actions: { value: FOUNDRY_NULL },
    category: 'interaction',
    frequency: { max: 1, per: 'PT1H' },
    description: {
      value:
        '<p><strong>Trigger</strong> An ally is about to use an action.</p>\n<p><strong>Requirements</strong> The ally is willing.</p>',
    },
  },
};

export const GRABBED: DocumentFixture = {
  id: 'kWc1fhmv9LBiTuei',
  name: 'Grabbed',
  type: 'condition',
  system: {
    value: { isValued: false, value: FOUNDRY_NULL },
    group: FOUNDRY_NULL,
    overrides: [],
    duration: { expiry: FOUNDRY_NULL, unit: 'unlimited', value: 0 },
    references: { children: [], immunityFrom: [], overriddenBy: [], overrides: [] },
    rules: [
      { inMemoryOnly: true, key: 'GrantItem', uuid: 'Compendium.pf2e.conditionitems.Item.Off-Guard' },
      { key: 'GrantItem', uuid: 'Compendium.pf2e.conditionitems.Item.eIcWbB5o3pP6OIMe' },
      { key: 'GrantItem', uuid: 'Compendium.pf2e.conditionitems.Item.Prone', predicate: ['self:flying'] },
    ],
  },
};

export function condition(id: string, name: string, system: object = {}): DocumentFixture {
  return { id, name, type: 'condition', system: { value: { isValued: false, value: FOUNDRY_NULL }, ...system } };
}

export const OFF_GUARD = condition('AJh5ex99aV6VTggg', 'Off-Guard');
export const IMMOBILIZED = condition('eIcWbB5o3pP6OIMe', 'Immobilized');
export const PRONE = condition('j91X7x0XSomq8d60', 'Prone');
export const BLINDED = condition('XgEqL1kFApUbl5Z2', 'Blinded', { group: 'senses', overrides: ['dazzled'] });
export const DAZZLED = condition('TkIyaNPgTZFBCCuh', 'Dazzled', { group: 'senses' });
export const FRIGHTENED = condition('TBSHQspnbcqxsmjL', 'Frightened', { value: { isValued: true, value: 1 } });

export function action(system: object, name = 'Test Action'): DocumentFixture {
  return { id: 'tSTAcT10n0000000', name, type: 'action', system: { actionType: { value: 'action' }, ...system } };
}

/** The gaps as reason, field and raw value. */
export function gapsOf({ kindDataGaps }: ImportTranslation): GapFields[] {
  return kindDataGaps.map(({ reason, field, raw }) => ({ reason, field, raw }));
}

export function entryOf(translation: ImportTranslation, slug: string): ImportedEntry | undefined {
  return translation.entries.find(({ envelope }) => slugName(envelope.slug) === slug);
}

export function dataOf(documents: readonly DocumentFixture[], slug: string): unknown {
  return entryOf(translate(documents), slug)?.kindData?.data;
}

/** An imported entry or an archetype: an envelope and its kind data. */
interface Translated {
  readonly envelope: ImportedEnvelope;
  readonly kindData?: ImportedKindData;
}

/** The entry as `ContentEntry` takes it, with a located source in place of the import's book-only one. */
export function contentEntry(entry: Translated | undefined): unknown {
  return (
    entry?.kindData && {
      ...entry.envelope,
      kind: entry.kindData.kind,
      data: entry.kindData.data,
      sources: [{ kind: SourceKind.Book, book: playerCore, page: 1 }],
    }
  );
}
