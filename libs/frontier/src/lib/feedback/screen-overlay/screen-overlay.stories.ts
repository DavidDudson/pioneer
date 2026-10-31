import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { ScreenOverlay } from './screen-overlay.component';

type ScreenOverlayStory = StoryObj<ScreenOverlay>;

const meta: Meta<ScreenOverlay> = {
  title: 'Feedback/Screen overlay',
  component: ScreenOverlay,
};
export default meta;

/** A transparent, click-through layer over the viewport; the page underneath stays usable. */
export const Default: ScreenOverlayStory = {};
