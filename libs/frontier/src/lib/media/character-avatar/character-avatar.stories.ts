import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { BROKEN_IMAGE, storyImage } from '../../testing/story-images';
import { Badge } from '../../text/badge/badge.component';
import { Size } from '../../tokens';
import { CharacterAvatar } from './character-avatar.component';

type CharacterAvatarStory = StoryObj<CharacterAvatar>;

const PORTRAIT = storyImage({ width: 200, height: 200, fromHue: 30, toHue: 280 });

const meta: Meta<CharacterAvatar> = {
  title: 'Media/CharacterAvatar',
  component: CharacterAvatar,
  decorators: [moduleMetadata({ imports: [Stack, Badge] })],
  argTypes: {
    size: { control: 'inline-radio', options: Object.values(Size) },
  },
  args: { name: 'Seelah of the Dawn', src: PORTRAIT, current: 14, max: 20, temp: 0, size: Size.Lg },
  render: (args) => ({
    props: args,
    template: `<fr-character-avatar ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Healthy: CharacterAvatarStory = { args: { current: 20 } };

/** Below half: the bar turns warning. */
export const Wounded: CharacterAvatarStory = { args: { current: 8 } };

/** Below a quarter: the bar turns danger. */
export const Critical: CharacterAvatarStory = { args: { current: 3 } };

export const Down: CharacterAvatarStory = { args: { current: 0 } };

/** Temporary points follow the hit points on the arc. */
export const TemporaryHitPoints: CharacterAvatarStory = { args: { current: 20, temp: 6 } };

/** At half HP the red vignette and splatter start, with a Bloodied cue. */
export const Bloodied: CharacterAvatarStory = { args: { current: 10 } };

/** A few hit points left: the vignette and splatter are strong. */
export const NearDeath: CharacterAvatarStory = { args: { current: 2 } };

/** At 0 HP and rolling death saves, none failed yet. */
export const DeathSavesBegin: CharacterAvatarStory = { args: { current: 0, failedSaves: 0 } };

export const OneFailedSave: CharacterAvatarStory = { args: { current: 0, failedSaves: 1 } };

export const TwoFailedSaves: CharacterAvatarStory = { args: { current: 0, failedSaves: 2 } };

/** The third failed save: the portrait is black. */
export const ThreeFailedSaves: CharacterAvatarStory = { args: { current: 0, failedSaves: 3 } };

/** No hit points, text in place of initials: the GM. No bar, no wounds. */
export const GameMaster: CharacterAvatarStory = {
  args: { name: 'Amiri', src: undefined, current: 0, max: 0, text: 'GM' },
};

/** No picture yet: the initials. */
export const Initials: CharacterAvatarStory = { args: { src: undefined } };

/** The picture failed to load, so the initials stand in. */
export const Failed: CharacterAvatarStory = { args: { src: BROKEN_IMAGE } };

/** Without a max there is no bar to draw. */
export const NoHitPoints: CharacterAvatarStory = { args: { current: 0, max: 0 } };

/** A long name truncates inside the circle's width. */
export const LongName: CharacterAvatarStory = {
  args: { name: 'Seelah of the Dawn, Warden of the Long Road' },
};

/** Badges (conditions, gifts) overlap the portrait's top corners. */
export const WithBadges: CharacterAvatarStory = {
  render: (args) => ({
    props: args,
    template: `
      <fr-character-avatar ${argsToTemplate(args)}>
        <fr-badge frCharacterAvatarStart>2</fr-badge>
        <fr-badge frCharacterAvatarEnd>1</fr-badge>
      </fr-character-avatar>
    `,
  }),
};

export const Sizes: CharacterAvatarStory = {
  render: () => ({
    props: { sizes: Object.values(Size), portrait: PORTRAIT },
    template: `
      <fr-stack direction="horizontal" align="end" gap="md">
        @for (size of sizes; track size) {
          <fr-character-avatar name="Seelah" [src]="portrait" [current]="9" [max]="20" [temp]="4" [size]="size" />
        }
      </fr-stack>
    `,
  }),
};
