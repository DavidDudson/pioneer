import { SlotStatus, SlotSubjectKind } from '@pioneer/character/domain';
import type { CharacterSlot } from '@pioneer/character/domain';
import { ContentId, contentId, ContentText, EntrySlug, PackId, SlotKey, Take } from '@pioneer/rules/sdk';
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
