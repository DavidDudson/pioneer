import { SlotStatus, SlotSubjectKind } from '@pioneer/character/domain';
import type { CharacterSlot } from '@pioneer/character/domain';
import { grantLookup } from '@pioneer/rules/grants';
import {
  ContentId,
  contentId,
  ContentKind,
  ContentLicense,
  ContentRegistry,
  ContentText,
  EntrySlug,
  PackId,
  SlotKey,
  Take,
} from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import type { ChoiceLine } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { lineOf } from './sheet-choices';

const ENTRY = ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('feat:domain-initiate')));
const NAME = ContentText.parse('Domain Initiate');
const PROMPT = ContentText.parse('Select a domain.');

function open(take: number | undefined, prompt: ContentText | undefined): CharacterSlot {
  return {
    status: SlotStatus.Open,
    key: SlotKey.parse('slot'),
    subject: {
      kind: SlotSubjectKind.Choice,
      entry: ENTRY,
      entryName: NAME,
      prompt,
      ...(take === undefined ? {} : { take: Take.parse(take) }),
    },
  };
}

describe(lineOf, () => {
  it('labels the first take by its entry and prompt', () => {
    expect(lineOf(open(undefined, PROMPT)).label).toStrictEqual(
      message('rules.choices.slot.choice', { entry: NAME, prompt: PROMPT }),
    );
  });

  it('names the take on a later one', () => {
    expect(lineOf(open(2, PROMPT)).label).toStrictEqual(
      message('rules.choices.slot.choiceTake', { entry: NAME, take: 2, prompt: PROMPT }),
    );
  });

  it('names the take on a later one without a prompt', () => {
    expect(lineOf(open(2, undefined)).label).toStrictEqual(
      message('rules.choices.slot.choiceOfTake', { entry: NAME, take: 2 }),
    );
  });
});

/** The line of a filled choice that picked the one feat of a pack published under `license`. */
function pickedFrom(license: ContentLicense): ChoiceLine {
  const registry = new ContentRegistry();
  registry.register(new ContentPackBuilder().withLicense(license).withFeat('sudden-charge').build());
  const lookup = grantLookup(registry);
  const [feat] = lookup.ofKind(ContentKind.Feat);
  if (feat === undefined) {
    throw new Error('The test pack holds no feat');
  }
  const slot: CharacterSlot = {
    status: SlotStatus.Filled,
    key: SlotKey.parse('slot'),
    subject: { kind: SlotSubjectKind.Choice, entry: ENTRY, entryName: NAME, prompt: PROMPT },
    selection: feat.id,
    selectionName: feat.name,
  };
  return lineOf(slot, lookup);
}

describe('the pick of a filled choice', () => {
  it('is flagged legacy when its entry is from a pre-remaster book', () => {
    expect(pickedFrom(ContentLicense.Ogl).selection).toStrictEqual({ name: 'Sudden-charge', legacy: true });
  });

  it('is not flagged when its entry is remaster', () => {
    expect(pickedFrom(ContentLicense.Orc).selection).toStrictEqual({ name: 'Sudden-charge' });
  });
});
