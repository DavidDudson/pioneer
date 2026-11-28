import type { Meta, StoryObj } from '@analogjs/storybook-angular';

type ColourScalesStory = StoryObj;

const ROLES = ['neutral', 'accent', 'danger', 'success', 'warning', 'info'] as const;
const STEP_COUNT = 12;
const STEPS = Array.from({ length: STEP_COUNT }).map((_unused, index) => index + 1);

interface StepUse {
  readonly steps: string;
  readonly use: string;
}

/** What each group of steps is for, the same in light and dark. */
const STEP_USES: ReadonlyArray<StepUse> = [
  { steps: '1-2', use: 'Backgrounds: the page and a subtle fill' },
  { steps: '3-5', use: 'Component fills: normal, hover, active' },
  { steps: '6-8', use: 'Borders: subtle, default, hover' },
  { steps: '9-10', use: 'Solid fills: normal, hover' },
  { steps: '11-12', use: 'Text: low and high contrast' },
];

/**
 * Twelve steps per colour role, generated in OKLCH from a theme's hue and chroma. Dark is the inverse ramp, and every
 * step has an alpha variant (`a1`-`a12`) that lays the same colour over the page. Switch the mode in the toolbar.
 */
const meta: Meta = {
  title: 'Foundations/Colour scales',
  parameters: { layout: 'padded' },
  render: () => ({
    props: { roles: ROLES, steps: STEPS, uses: STEP_USES },
    template: `
      <div class="flex flex-col gap-lg text-fg-default">
        <table class="w-full text-body">
          <tbody>
            @for (row of uses; track row.steps) {
              <tr><td class="py-2xs pe-md align-top">{{ row.steps }}</td><td class="py-2xs">{{ row.use }}</td></tr>
            }
          </tbody>
        </table>
        @for (role of roles; track role) {
          <div class="flex flex-col gap-xs">
            <div class="text-label">{{ role }}</div>
            <div class="grid grid-cols-12">
              @for (step of steps; track step) {
                <div class="flex h-touch items-end p-3xs text-caption" [style.background-color]="'var(--fr-ramp-' + role + '-' + step + ')'">{{ step }}</div>
              }
            </div>
            <div class="grid grid-cols-12">
              @for (step of steps; track step) {
                <div class="flex h-touch items-end p-3xs text-caption" [style.background-color]="'var(--fr-ramp-' + role + '-a' + step + ')'">a{{ step }}</div>
              }
            </div>
          </div>
        }
      </div>
    `,
  }),
};

export default meta;

export const Scales: ColourScalesStory = {};
