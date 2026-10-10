import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { PackId, SourceRef } from '@pioneer/rules/sdk';
import { UserId } from '@pioneer/shared/kernel';

import { SourceLineView } from './source-line.component';

const AUTHOR = UserId.parse('0b6f1c9e-4f8a-4d3b-9a51-6b0e8f2c7d14');
const PACK = PackId.parse('lost-lands');
const AON_HUMAN = 'https://2e.aonprd.com/Ancestries.aspx?ID=64';

const sources = (...input: readonly unknown[]): readonly SourceRef[] => input.map((source) => SourceRef.parse(source));

type SourceLineStory = StoryObj<SourceLineView>;

const meta: Meta<SourceLineView> = {
  title: 'Rules/Source line',
  component: SourceLineView,
};
export default meta;

/** A book page with its AoN entry, the usual source. */
export const Book: SourceLineStory = {
  args: { sources: sources({ kind: 'book', book: 'player-core', page: 46, aon: AON_HUMAN }) },
};

export const BookPageOnly: SourceLineStory = {
  args: { sources: sources({ kind: 'book', book: 'gm-core', page: 12 }) },
};

export const BookAonOnly: SourceLineStory = {
  args: { sources: sources({ kind: 'book', book: 'monster-core', aon: AON_HUMAN }) },
};

/** A book the registry does not know shows its id, so the gap is visible. */
export const UnregisteredBook: SourceLineStory = {
  args: { sources: sources({ kind: 'book', book: 'lost-omens-legends', page: 3 }) },
};

export const Web: SourceLineStory = {
  args: { sources: sources({ kind: 'web', url: 'https://paizo.com/errata', title: 'Remaster errata' }) },
};

/** Without a title, the link shows the URL's host. */
export const WebWithoutTitle: SourceLineStory = {
  args: { sources: sources({ kind: 'web', url: 'https://www.example.com/rules/flanking' }) },
};

/** The caller passes the pack's and author's display names. */
export const Homebrew: SourceLineStory = {
  args: {
    sources: sources({ kind: 'homebrew', pack: PACK, author: AUTHOR, url: 'https://example.com/lost-lands' }),
    authorNames: new Map([[AUTHOR, 'Ezren']]),
    packNames: new Map([[PACK, 'The Lost Lands']]),
  },
};

/** Without names, the pack shows its id and the author is unknown. */
export const HomebrewWithoutNames: SourceLineStory = {
  args: { sources: sources({ kind: 'homebrew', pack: PACK, author: AUTHOR }) },
};

/** Several sources join in order. */
export const Several: SourceLineStory = {
  args: {
    sources: sources(
      { kind: 'book', book: 'player-core', page: 46, aon: AON_HUMAN },
      { kind: 'web', url: 'https://paizo.com/errata', title: 'Remaster errata' },
      { kind: 'homebrew', pack: PACK, author: AUTHOR },
    ),
    authorNames: new Map([[AUTHOR, 'Ezren']]),
  },
};
