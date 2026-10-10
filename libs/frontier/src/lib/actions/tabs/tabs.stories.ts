import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, waitFor, within } from 'storybook/test';
import { onTestFinished } from 'vitest';

import { Box } from '../../layout/box/box.component';
import { pressKeys } from '../../testing/story-keyboard';
import { Tab } from '../tab/tab.component';
import { Tabs } from './tabs.component';

type TabsStory = StoryObj<Tabs>;

const SECTIONS = [
  'Overview',
  'Attributes',
  'Skills',
  'Strikes',
  'Actions',
  'Feats',
  'Features',
  'Spells',
  'Inventory',
  'Conditions',
  'Effects',
  'Notes',
];

/** The route of a section: Overview is the root, the rest sit under it. */
function route(section: string): string {
  return section === 'Overview' ? '/' : `/${section.toLowerCase()}`;
}

/**
 * Sheet section tabs. Each tab is a router link to its own route, so the URL names the section; the current one
 * is `aria-current="page"` with a heavier accent underline. Storybook starts at `/`, so Overview is current.
 */
const meta: Meta<Tabs> = {
  title: 'Actions/Tabs',
  component: Tabs,
  decorators: [moduleMetadata({ imports: [Box, Tab] })],
  parameters: { layout: 'padded' },
  render: () => ({
    template: `<fr-tabs label="Sheet sections">
      <fr-tab to="/" exact>Overview</fr-tab>
      <fr-tab to="/feats">Feats</fr-tab>
      <fr-tab to="/spells">Spells</fr-tab>
    </fr-tabs>`,
  }),
};
export default meta;

export const Default: TabsStory = {};

/**
 * More sections than fit: the row scrolls sideways on its own, and the page does not. Shown in a prose-width box so
 * it overflows at any viewport, as it does on a phone.
 */
export const ManySections: TabsStory = {
  render: () => ({
    props: { sections: SECTIONS.map((label) => ({ label, to: route(label) })) },
    template: `<fr-box width="prose">
      <fr-tabs label="Sheet sections">
        @for (section of sections; track section.to) {
          <fr-tab [to]="section.to" [exact]="section.to === '/'">{{ section.label }}</fr-tab>
        }
      </fr-tabs>
    </fr-box>`,
  }),
};

interface SectionTabs {
  readonly overview: HTMLElement;
  readonly attributes: HTMLElement;
  readonly notes: HTMLElement;
  readonly nav: HTMLElement;
}

/**
 * The many-sections story's first, second and last tabs and its nav. The router is the runner's, shared by later
 * stories, so it goes back to `/` when the test ends.
 */
function sectionTabs(canvasElement: HTMLElement): SectionTabs {
  const canvas = within(canvasElement);
  const overview = canvas.getByRole('link', { name: 'Overview' });
  onTestFinished(() => {
    overview.click();
  });
  return {
    overview,
    attributes: canvas.getByRole('link', { name: 'Attributes' }),
    notes: canvas.getByRole('link', { name: 'Notes' }),
    nav: canvas.getByRole('navigation', { name: 'Sheet sections' }),
  };
}

/**
 * Keyboard: the tabs are one Tab stop on the current tab; arrows and End move focus without navigating, and Enter
 * follows the focused tab, which becomes current and is scrolled into view. Runs only in
 * `nx test-storybook frontier`.
 */
export const Keyboard: TabsStory = {
  ...ManySections,
  // Real key presses need the Vitest runner (testing/story-keyboard.ts), so this story is test-only.
  tags: ['!dev'],
  play: async ({ canvasElement, userEvent }) => {
    const { overview, attributes, notes, nav } = sectionTabs(canvasElement);
    await expect(nav.scrollWidth).toBeGreaterThan(nav.clientWidth);
    await userEvent.tab();
    await expect(overview).toHaveFocus();

    await pressKeys('{ArrowRight}');
    await expect(attributes).toHaveFocus();
    await expect(overview).toHaveAttribute('aria-current', 'page');

    await pressKeys('{End}{Enter}');
    await waitFor(async () => expect(notes).toHaveAttribute('aria-current', 'page'));
    await expect(overview).not.toHaveAttribute('aria-current');
    await expect(notes).toHaveAttribute('tabindex', '0');
  },
};

/** Whether `element` lies sideways inside `region`'s visible box. */
function insideInline(region: HTMLElement, element: HTMLElement): boolean {
  const bounds = region.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return rect.left >= Math.floor(bounds.left) && rect.right <= Math.ceil(bounds.right);
}

/**
 * A navigation that doesn't move focus (a link elsewhere on the page, Back) still scrolls the row to the current
 * tab, and leaves the page where it is.
 */
export const KeepsCurrentInView: TabsStory = {
  ...ManySections,
  play: async ({ canvasElement }) => {
    const { notes, nav } = sectionTabs(canvasElement);
    const pageScroll = window.scrollY;
    await expect(insideInline(nav, notes)).toBe(false);
    // `click()` follows the link without focusing it, so the browser doesn't scroll it into view itself.
    notes.click();
    await waitFor(async () => expect(notes).toHaveAttribute('aria-current', 'page'));
    await waitFor(async () => expect(insideInline(nav, notes)).toBe(true));
    await expect(notes).not.toHaveFocus();
    await expect(window.scrollY).toBe(pageScroll);
  },
};
