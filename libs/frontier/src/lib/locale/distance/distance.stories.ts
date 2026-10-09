import { applicationConfig, argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { signal } from '@angular/core';
import { DistanceUnit } from '@pioneer/shared/kernel';

import { Text } from '../../text/text/text.component';
import { DISTANCE_UNIT } from '../locale-format';
import { Distance } from './distance.component';

type DistanceStory = StoryObj<Distance>;

/** Rules distances are always feet; the component shows them in the viewer's unit and locale. */
const meta: Meta<Distance> = {
  title: 'Locale/Distance',
  component: Distance,
  decorators: [moduleMetadata({ imports: [Text] })],
  args: { feet: 25 },
  render: (args) => ({
    props: args,
    template: `<fr-text>Speed <fr-distance ${argsToTemplate(args)} /></fr-text>`,
  }),
};
export default meta;

export const Feet: DistanceStory = {};

export const Metres: DistanceStory = {
  decorators: [
    applicationConfig({ providers: [{ provide: DISTANCE_UNIT, useValue: signal(DistanceUnit.Metres).asReadonly() }] }),
  ],
};
