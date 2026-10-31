import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { ContentLicense, ProductLine, SourceRef } from '@pioneer/rules/sdk';
import { expect, within } from 'storybook/test';

import { SourceBadge, SourceBadgeMode } from './source-badge.component';
import { bookOf, PLAYER_CORE, PLAYER_CORE_SOURCE, WEB_SOURCE } from './source-badge.fixtures';

type SourceBadgeStory = StoryObj<SourceBadge>;

const meta: Meta<SourceBadge> = {
  title: 'Rules/Source badge',
  component: SourceBadge,
  args: { source: PLAYER_CORE_SOURCE, book: PLAYER_CORE, license: ContentLicense.Orc, mode: SourceBadgeMode.Compact },
};
export default meta;

const bookSource = (book: string): SourceRef => SourceRef.parse({ kind: 'book', book });

/** The book icon alone; the popover holds the details. */
export const Compact: SourceBadgeStory = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: /Player Core/u })).toBeVisible();
  },
};

/** The icon, the name and the year. */
export const Expanded: SourceBadgeStory = {
  args: { mode: SourceBadgeMode.Expanded },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Player Core 2023')).toBeVisible();
  },
};

/** OGL content inside a remaster book takes the legacy shade. */
export const OglInRemasterBook: SourceBadgeStory = {
  args: { mode: SourceBadgeMode.Expanded, license: ContentLicense.Ogl },
};

export const LostOmens: SourceBadgeStory = {
  args: {
    mode: SourceBadgeMode.Expanded,
    source: bookSource('divine-mysteries'),
    book: bookOf('divine-mysteries', ProductLine.LostOmens, true),
  },
};

export const LegacyLostOmens: SourceBadgeStory = {
  args: {
    mode: SourceBadgeMode.Expanded,
    source: bookSource('impossible-lands'),
    book: bookOf('impossible-lands', ProductLine.LostOmens, false),
    license: ContentLicense.Ogl,
  },
};

export const Campaign: SourceBadgeStory = {
  args: {
    mode: SourceBadgeMode.Expanded,
    source: bookSource('season-of-ghosts'),
    book: bookOf('season-of-ghosts', ProductLine.AdventurePaths, true),
  },
};

export const LegacyCampaign: SourceBadgeStory = {
  args: {
    mode: SourceBadgeMode.Expanded,
    source: bookSource('the-show-must-go-on'),
    book: bookOf('the-show-must-go-on', ProductLine.AdventurePaths, false),
    license: ContentLicense.Ogl,
  },
};

export const Adventure: SourceBadgeStory = {
  args: {
    mode: SourceBadgeMode.Expanded,
    source: bookSource('prey-for-death'),
    book: bookOf('prey-for-death', ProductLine.Adventures, true),
  },
};

export const LegacyAdventure: SourceBadgeStory = {
  args: {
    mode: SourceBadgeMode.Expanded,
    source: bookSource('troubles-in-grayce'),
    book: bookOf('troubles-in-grayce', ProductLine.Adventures, false),
    license: ContentLicense.Ogl,
  },
};

export const Society: SourceBadgeStory = {
  args: {
    mode: SourceBadgeMode.Expanded,
    source: bookSource('clockwork-mystery'),
    book: bookOf('clockwork-mystery', ProductLine.Society, true),
  },
};

export const LegacySociety: SourceBadgeStory = {
  args: {
    mode: SourceBadgeMode.Expanded,
    source: bookSource('clockwork-mystery'),
    book: bookOf('clockwork-mystery', ProductLine.Society, false),
    license: ContentLicense.Ogl,
  },
};

/** A homebrew pack. */
export const Homebrew: SourceBadgeStory = {
  args: {
    mode: SourceBadgeMode.Expanded,
    source: SourceRef.parse({ kind: 'homebrew', author: '0b6f1c9e-4f8a-4d3b-9a51-6b0e8f2c7d14', pack: 'lost-lands' }),
    book: undefined,
    license: ContentLicense.Homebrew,
    packName: 'The Lost Lands',
  },
};

export const Web: SourceBadgeStory = {
  args: { mode: SourceBadgeMode.Expanded, source: WEB_SOURCE, book: undefined, license: ContentLicense.Homebrew },
};

/** A book the registry does not hold, or a comic: the neutral fallback. */
export const Unknown: SourceBadgeStory = {
  args: { mode: SourceBadgeMode.Expanded, source: bookSource('lost-omens-legends'), book: undefined },
};
