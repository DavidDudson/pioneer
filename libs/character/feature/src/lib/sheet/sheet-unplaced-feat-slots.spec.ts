import { PrerequisiteStatus, SlotStatus, SlotSubjectKind } from '@pioneer/character/domain';
import type { CharacterSlot } from '@pioneer/character/domain';
import {
  ChoiceValue,
  ContentId,
  contentId,
  EntrySlug,
  FeatCategory,
  PackId,
  Rarity,
  SlotKey,
} from '@pioneer/rules/sdk';
import { ActionKind } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import type { SheetFeatOption, SheetFeatSlot } from './sheet-feats';
import { slotsOpenTo } from './sheet-unplaced-feat-slots';

const pack = PackId.parse('player-core');
const FEAT = ContentId.parse(contentId(pack, EntrySlug.parse('feat:power-attack')));
const OTHER = ContentId.parse(contentId(pack, EntrySlug.parse('feat:toughness')));

function option(value: ContentId, locked = false): SheetFeatOption {
  return {
    value,
    label: 'Feat',
    level: 1,
    category: FeatCategory.General,
    action: ActionKind.Passive,
    rarity: Rarity.Common,
    traits: [],
    sources: [],
    status: PrerequisiteStatus.Met,
    clauses: undefined,
    prerequisites: undefined,
    locked: locked ? { archetype: 'Dedication', needed: 1 } : undefined,
  };
}

function slot(key: string, options: readonly SheetFeatOption[]): SheetFeatSlot {
  return {
    key: SlotKey.parse(key),
    label: message('character.sheet.feats.slot'),
    options,
    storedName: undefined,
    trainedAgain: () => new Map(),
    reason: undefined,
  };
}

function read(key: string, status: typeof SlotStatus.Open | typeof SlotStatus.Filled): CharacterSlot {
  const subject = { kind: SlotSubjectKind.Flaw } as const;
  return status === SlotStatus.Open
    ? { status, key: SlotKey.parse(key), subject }
    : { status, key: SlotKey.parse(key), subject, selection: ChoiceValue.parse(FEAT) };
}

describe(slotsOpenTo, () => {
  it('offers an open slot that lists the feat', () => {
    const feats = [slot('a', [option(FEAT)])];
    expect(slotsOpenTo(FEAT, feats, [read('a', SlotStatus.Open)])).toStrictEqual(feats);
  });

  it('skips a filled slot, so a move never replaces a pick', () => {
    const feats = [slot('a', [option(FEAT)])];
    expect(slotsOpenTo(FEAT, feats, [read('a', SlotStatus.Filled)])).toStrictEqual([]);
  });

  it('skips a slot that does not list the feat or lists it locked', () => {
    const feats = [slot('a', [option(OTHER)]), slot('b', [option(FEAT, true)])];
    const reads = [read('a', SlotStatus.Open), read('b', SlotStatus.Open)];
    expect(slotsOpenTo(FEAT, feats, reads)).toStrictEqual([]);
  });
});
