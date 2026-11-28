import { SlotStatus } from '@pioneer/character/domain';
import type { CharacterSlot, Companion } from '@pioneer/character/domain';
import { ContentId, contentId, ContentText, EntrySlug, PackId, SlotKey } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { companionSlots } from './sheet-companions';
import type { SpeciesOption } from './sheet-companions';

const pack = PackId.parse('player-core');
const feat = ContentId.parse(contentId(pack, EntrySlug.parse('feat:animal-companion')));
const wolf = ContentId.parse(contentId(pack, EntrySlug.parse('companion-species:wolf')));
const key = SlotKey.parse('class-feat-1:0');

// SAFETY: the helpers under test read only a species' id and name, never its block.
const block = {} as SpeciesOption['block'];
const species: readonly SpeciesOption[] = [{ id: wolf, name: ContentText.parse('Wolf'), block }];

function slot(selection: ContentId | undefined): CharacterSlot {
  const subject = {
    kind: 'choice',
    entry: feat,
    entryName: ContentText.parse('Animal Companion'),
    prompt: ContentText.parse('Species'),
  } as const;

  return selection === undefined
    ? { status: SlotStatus.Open, key, subject }
    : { status: SlotStatus.Filled, key, subject, selection };
}

const none: readonly Companion[] = [];

describe(companionSlots, () => {
  it('lists the species choice of an Animal Companion feat, open while nothing is picked', () => {
    const [view] = companionSlots([slot(undefined)], species, []);

    expect(view?.picked).toBeUndefined();
    expect(view?.companion).toBeUndefined();
  });

  it('names the species picked in a filled choice', () => {
    const [view] = companionSlots([slot(wolf)], species, []);

    expect(view?.picked?.name).toBe('Wolf');
  });

  it('ignores slots that are not a companion feat’s choice', () => {
    const other: CharacterSlot = {
      status: SlotStatus.Open,
      key,
      subject: {
        kind: 'choice',
        entry: ContentId.parse(contentId(pack, EntrySlug.parse('feat:power-attack'))),
        entryName: ContentText.parse('x'),
        prompt: ContentText.parse('y'),
      },
    };

    expect(companionSlots([other], species, none)).toStrictEqual([]);
  });
});
