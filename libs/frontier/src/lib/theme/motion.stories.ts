import type { Meta, StoryObj } from '@analogjs/storybook-angular';

type MotionStory = StoryObj;

interface MotionRow {
  readonly token: string;
  readonly duration: string;
  readonly easing: string;
  readonly use: string;
}

/** The four motion tokens. Each is a duration and an easing; reduced motion collapses all of them. */
const MOTION_ROWS: ReadonlyArray<MotionRow> = [
  {
    token: 'enter',
    duration: '200ms',
    easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    use: 'A thing arriving: decelerates in',
  },
  {
    token: 'exit',
    duration: '120ms',
    easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
    use: 'A thing leaving: accelerates out, shorter than enter',
  },
  {
    token: 'move',
    duration: '200ms',
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    use: 'A thing changing place or state: button and disclosure hover colour',
  },
  {
    token: 'emphasis',
    duration: '400ms',
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    use: 'A one-off attention cue: toast pop, natural burst, gift wiggle. Loops (shimmer, rune pulse, status border) are multiples of it',
  },
];

/** Use `duration-<token> ease-<token>` in a class list, or `var(--fr-duration-<token>)` and `var(--fr-ease-<token>)` in CSS. */
const meta: Meta = {
  title: 'Foundations/Motion',
  parameters: { layout: 'padded' },
  render: () => ({
    props: { rows: MOTION_ROWS },
    template: `
      <table class="w-full text-body text-fg-default">
        <thead>
          <tr>
            <th class="text-start">Token</th>
            <th class="text-start">Duration</th>
            <th class="text-start">Easing</th>
            <th class="text-start">Use</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track row.token) {
            <tr>
              <td class="py-xs pe-md align-top">{{ row.token }}</td>
              <td class="py-xs pe-md align-top">{{ row.duration }}</td>
              <td class="py-xs pe-md align-top">{{ row.easing }}</td>
              <td class="py-xs">{{ row.use }}</td>
            </tr>
          }
        </tbody>
      </table>
    `,
  }),
};

export default meta;

export const Tokens: MotionStory = {};
