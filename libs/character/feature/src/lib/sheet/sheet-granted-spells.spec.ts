import { preparedReads, preparedSlots, signatureSlots } from '@pioneer/character/domain';
import type { CharacterDocument, SlotContent } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import {
  ContentKind,
  contentId,
  contentPackFromContents,
  ContentRegistry,
  EntrySlug,
  PackId,
} from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';
import { PREBUILD_TIMEOUT } from '../testing/provide-server-state-testing';
import { cutTo } from '../testing/test-packs';
import { sheetSlotContent } from './sheet-slot-content';

/** A sorcerer and an oracle read from the committed Player Core 2 pack: the gifts the importer wrote (ADR-0062). */
const PLAYER_CORE_2 = PackId.parse('player-core-2');
const idOf = (slug: string): string => contentId(PLAYER_CORE_2, EntrySlug.parse(slug));

/** A character at `level` of `className`, its `slot` feature's pick being `pick`. */
interface Build {
  readonly className: string;
  readonly feature: string;
  readonly pick: string;
  readonly level: number;
}

let content: SlotContent | undefined = undefined;

function contentOf(): SlotContent {
  if (content === undefined) {
    throw new Error('Expected the packs to be loaded');
  }
  return content;
}

function character({ className, feature, pick, level }: Build): CharacterDocument {
  return new CharacterBuilder()
    .atLevel(level)
    .picking('class', idOf(`class:${className}`))
    .picking('boost:1:class:0', 'cha')
    .picking(`${idOf(`class-feature:${feature}`)}:0`, idOf(`class-feature:${pick}`))
    .build().document;
}

/** The spell each repertoire slot an element fills holds, by its key. */
function gifts(document: CharacterDocument): Record<string, string> {
  const slots = preparedSlots(document, preparedReads(document, contentOf()));
  return Object.fromEntries(
    slots.filter((slot) => slot.granted).map((slot) => [String(slot.key), String(slot.pick?.name)]),
  );
}

const DEMONIC: Build = { className: 'sorcerer', feature: 'bloodline', pick: 'bloodline-demonic', level: 3 };

describe('granted repertoire spells in Player Core 2', () => {
  beforeAll(async () => {
    const registry = new ContentRegistry();
    const packs = await Promise.all(
      cutTo([...CHARACTER_CONTENT_KINDS, ContentKind.Spell]).map(async (loader) => loader.load()),
    );
    for (const pack of packs) {
      registry.register(contentPackFromContents(pack));
    }
    content = sheetSlotContent(registry);
  }, PREBUILD_TIMEOUT);

  it("holds a 3rd-level demonic sorcerer's bloodline gifts in the first slot of each rank, cantrips included", () => {
    expect(gifts(character(DEMONIC))).toStrictEqual({
      'repertoire:sorcerer:cantrip:0': 'Caustic Blast',
      'repertoire:sorcerer:1:0': 'Fear',
      'repertoire:sorcerer:2:0': 'Enlarge',
    });
  });

  it("is as big as the sorcerer's slots: five cantrips, four 1st-rank spells, three 2nd-rank at 3rd level", () => {
    const document = character(DEMONIC);
    const keys = preparedSlots(document, preparedReads(document, contentOf())).map((slot) => String(slot.key));

    expect(keys.filter((key) => key.startsWith('repertoire:sorcerer:cantrip'))).toHaveLength(5);
    expect(keys.filter((key) => key.startsWith('repertoire:sorcerer:1:'))).toHaveLength(4);
    expect(keys.filter((key) => key.startsWith('repertoire:sorcerer:2:'))).toHaveLength(3);
  });

  it('offers a gift for the signature slot of its rank', () => {
    const document = character(DEMONIC);
    const first = signatureSlots(document, preparedReads(document, contentOf())).find(
      (slot) => String(slot.key) === 'signature:sorcerer:1',
    );

    expect(first?.options.map((spell) => String(spell.name))).toStrictEqual(['Fear']);
  });

  it("holds an oracle's mystery spells in the divine repertoire", () => {
    const flames: Build = { className: 'oracle', feature: 'mystery', pick: 'flames', level: 3 };

    expect(gifts(character(flames))).toStrictEqual({
      'repertoire:oracle:cantrip:0': 'Ignition',
      'repertoire:oracle:1:0': 'Breathe Fire',
      'repertoire:oracle:2:0': 'Blazing Bolt',
    });
  });
});
