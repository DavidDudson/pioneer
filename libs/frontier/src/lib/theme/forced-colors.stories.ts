import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from '../actions/button/button.component';
import { Picker } from '../controls/picker/picker.component';
import { Segmented } from '../controls/segmented/segmented.component';
import { Select } from '../controls/select/select.component';
import { ToggleButton } from '../controls/toggle-button/toggle-button.component';
import { tableSchema } from '../data/table/table-schema';
import { Meter } from '../feedback/meter/meter.component';
import { Skeleton } from '../feedback/skeleton/skeleton.component';
import { Stack } from '../layout/stack/stack.component';
import { Surface } from '../layout/surface/surface.component';
import { emulateForcedColors, paintedAcross, systemColour } from '../testing/story-forced-colors';
import { pressKeys } from '../testing/story-keyboard';
import { hover } from '../testing/story-pointer';
import { Badge } from '../text/badge/badge.component';
import { Text } from '../text/text/text.component';

type ForcedColorsStory = StoryObj;

interface Ancestry {
  readonly value: string;
  readonly label: string;
}

/** Points across the bar meter, as fractions of its width: inside its 70% fill, and in the empty track. */
const FILLED_AT = 0.2;
const TRACK_AT = 0.9;

const ANCESTRIES: readonly Ancestry[] = [
  { value: 'dwarf', label: 'Dwarf' },
  { value: 'elf', label: 'Elf' },
  { value: 'gnome', label: 'Gnome' },
  { value: 'human', label: 'Human' },
];

const PROPS = {
  units: [
    { value: 'feet', label: 'Feet' },
    { value: 'metres', label: 'Metres' },
  ],
  ancestries: ANCESTRIES,
  ancestryColumns: tableSchema<Ancestry>()
    .addText({ id: 'label', header: 'Ancestry', value: (ancestry) => ancestry.label })
    .build(),
  ancestryValue: (ancestry: Ancestry): string => ancestry.value,
  ancestryLabel: (ancestry: Ancestry): string => ancestry.label,
};

/**
 * Windows High Contrast replaces every colour with the user's palette, except CSS system colours. Frontier keeps
 * control edges, focus, pressed and selected states, meters and skeletons visible there with `forced-colors:`
 * variants that use system colours only.
 */
const meta: Meta = {
  title: 'Accessibility/Forced Colours',
  decorators: [
    moduleMetadata({
      imports: [Badge, Button, Meter, Picker, Segmented, Select, Skeleton, Stack, Surface, Text, ToggleButton],
    }),
  ],
  parameters: { layout: 'padded' },
  render: () => ({
    props: PROPS,
    template: `
      <fr-stack gap="md">
        <fr-stack direction="horizontal" gap="sm">
          <fr-button>Secondary</fr-button>
          <fr-button variant="primary">Primary</fr-button>
          <fr-button variant="ghost">Ghost</fr-button>
          <fr-button variant="danger">Danger</fr-button>
        </fr-stack>
        <fr-stack direction="horizontal" gap="sm">
          <fr-toggle-button [value]="true">Fortune</fr-toggle-button>
          <fr-toggle-button [value]="false">Misfortune</fr-toggle-button>
        </fr-stack>
        <fr-segmented ariaLabel="Distance unit" [options]="units" value="feet" />
        <fr-select ariaLabel="Ancestry" [options]="ancestries" value="elf" />
        <fr-picker
          ariaLabel="Heritage"
          value="elf"
          [rows]="ancestries"
          [columns]="ancestryColumns"
          [rowValue]="ancestryValue"
          [rowLabel]="ancestryLabel"
        />
        <fr-stack direction="horizontal" gap="sm">
          <fr-badge>Subtle</fr-badge>
          <fr-badge tone="danger" variant="solid">Solid</fr-badge>
        </fr-stack>
        <fr-meter label="Hero points" variant="segmented" [value]="2" [max]="3" />
        <fr-meter label="Hit points" [value]="28" [max]="40" />
        <fr-surface variant="sunken" padding="sm">
          <fr-text element="p">A sunken panel</fr-text>
        </fr-surface>
        <fr-surface variant="base" padding="sm">
          <fr-text element="p">A base panel</fr-text>
        </fr-surface>
        <fr-skeleton />
      </fr-stack>
    `,
  }),
};
export default meta;

function style(element: Element | null | undefined): CSSStyleDeclaration | undefined {
  return element ? getComputedStyle(element) : undefined;
}

/** Whether a box draws a border at top and bottom. */
function bordered(element: Element | null | undefined): boolean {
  const box = style(element);
  return (
    box !== undefined &&
    box.borderTopStyle !== 'none' &&
    box.borderTopWidth !== '0px' &&
    box.borderBottomWidth !== '0px'
  );
}

/** The palette is really applied, not just the media query; every button has an edge; focus is Highlight. */
async function expectEdgesAndFocus(root: HTMLElement): Promise<void> {
  const canvas = within(root);
  await expect(globalThis.matchMedia('(forced-colors: active)').matches).toBe(true);
  await expect(style(canvas.getByText('A sunken panel'))?.color).toBe(systemColour('CanvasText'));
  const buttons = ['Secondary', 'Primary', 'Ghost', 'Danger'].map((name) => canvas.getByRole('button', { name }));
  await expect(buttons.map((button) => bordered(button))).toEqual([true, true, true, true]);
  await pressKeys('{Tab}');
  await expect(buttons[0]).toHaveFocus();
  await expect(style(buttons[0])?.outlineColor).toBe(systemColour('Highlight'));
}

/** A pressed button fills with Highlight, hovered too: `aria-pressed:hover:` must not win back its accent. */
async function expectHighlightedWhenHovered(button: HTMLElement): Promise<void> {
  const highlight = [systemColour('Highlight'), systemColour('HighlightText')];
  await expect([style(button)?.backgroundColor, style(button)?.color]).toEqual(highlight);
  await hover(button);
  await expect([style(button)?.backgroundColor, style(button)?.color]).toEqual(highlight);
}

/** A pressed toggle and the chosen segment fill with Highlight; their neighbours don't. */
async function expectPressed(root: HTMLElement): Promise<void> {
  const canvas = within(root);
  await expectHighlightedWhenHovered(canvas.getByRole('button', { name: 'Fortune', pressed: true }));
  await expectHighlightedWhenHovered(canvas.getByRole('button', { name: 'Feet', pressed: true }));
  const highlight = systemColour('Highlight');
  const unpressed = ['Misfortune', 'Metres'].map((name) => canvas.getByRole('button', { name, pressed: false }));
  await expect(unpressed.map((button) => style(button)?.backgroundColor === highlight)).toEqual([false, false]);
}

/** A solid badge inverts the palette; meter fills, a skeleton and base and sunken panels stay visible. */
async function expectFills(root: HTMLElement): Promise<void> {
  const canvas = within(root);
  const solid = style(canvas.getByText('Solid'));
  await expect([solid?.backgroundColor, solid?.color]).toEqual([systemColour('CanvasText'), systemColour('Canvas')]);
  const segments = [...root.querySelectorAll('fr-meter span[aria-hidden] > span')];
  const highlight = systemColour('Highlight');
  await expect(segments.map((segment) => style(segment)?.backgroundColor === highlight)).toEqual([true, true, false]);
  await expect(style(root.querySelector('fr-skeleton'))?.backgroundColor).toBe(systemColour('GrayText'));
  const panels = [...root.querySelectorAll('fr-surface')];
  await expect(panels.map((panel) => bordered(panel))).toEqual([true, true]);
}

/**
 * The bar meter's fill (28 of 40) paints a colour of its own, not the track's: only a screenshot can see it. Chromium
 * already paints a forced meter fill Highlight; `forced-colors:meter-value:` says so for other engines.
 */
async function expectBarFilled(root: HTMLElement): Promise<void> {
  const bar = within(root).getByRole('meter', { name: 'Hit points' });
  const [filled, track] = await paintedAcross(bar, [FILLED_AT, TRACK_AT]);
  await expect(filled).not.toBe(track);
}

/** In an open select the keyboard's option fills with Highlight and the selected one is underlined. */
async function expectOptions(root: HTMLElement): Promise<void> {
  const canvas = within(root);
  await userEvent.click(canvas.getByRole('combobox', { name: 'Ancestry' }));
  const page = within(document.body);
  const elf = await page.findByRole('option', { name: 'Elf', selected: true });
  await pressKeys('{ArrowDown}');
  const gnome = page.getByRole('option', { name: 'Gnome' });
  await expect(gnome).toHaveAttribute('data-active', 'true');
  const active = style(gnome);
  await expect([active?.backgroundColor, active?.color]).toEqual([
    systemColour('Highlight'),
    systemColour('HighlightText'),
  ]);
  await expect(style(elf)?.textDecorationLine).toBe('underline');
  await expect(style(elf)?.backgroundColor).not.toBe(systemColour('Highlight'));
  await pressKeys('{Escape}');
}

/** In an open picker the keyboard's row fills with Highlight and the picked one is underlined. */
async function expectPickerRows(root: HTMLElement): Promise<void> {
  const canvas = within(root);
  await userEvent.click(canvas.getByRole('button', { name: /^Heritage/u }));
  const elf = await canvas.findByRole('gridcell', { name: 'Elf', selected: true });
  await pressKeys('{ArrowDown}');
  const active = await waitFor(() => {
    const cell = root.querySelector<HTMLElement>('[role="gridcell"][data-active="true"]');
    if (cell === null) {
      throw new Error('Expected a highlighted cell');
    }
    return cell;
  });
  await expect([style(active)?.backgroundColor, style(active)?.color]).toEqual([
    systemColour('Highlight'),
    systemColour('HighlightText'),
  ]);
  await expect(style(elf)?.textDecorationLine).toBe('underline');
  await pressKeys('{Escape}');
}

/**
 * With forced colours on, every state above is checked against the system colours it should use. Runs only in
 * `nx test-storybook frontier`.
 */
export const Default: ForcedColorsStory = {
  // Forced colours and real key presses need the Vitest runner (testing/story-forced-colors.ts), so this is test-only.
  tags: ['!dev'],
  beforeEach: emulateForcedColors,
  // Under forced colours the user's palette sets contrast, not frontier's tokens.
  // Axe measures theme text (#fbfaf9) on white here, 1.04:1, a pair in neither the theme nor the forced palette
  // (the play function sees CanvasText). The theme stories check contrast.
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
  play: async ({ canvasElement }) => {
    await expectEdgesAndFocus(canvasElement);
    await expectPressed(canvasElement);
    await expectFills(canvasElement);
    await expectBarFilled(canvasElement);
    await expectOptions(canvasElement);
    await expectPickerRows(canvasElement);
  },
};

/** Forced colours are off again for whatever runs next on the runner's page, even after the story above. */
export const ResetAfterwards: ForcedColorsStory = {
  tags: ['!dev'],
  play: async () => {
    await expect(globalThis.matchMedia('(forced-colors: active)').matches).toBe(false);
  },
};
