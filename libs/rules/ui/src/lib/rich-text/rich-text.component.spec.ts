import { DeferBlockState, TestBed } from '@angular/core/testing';
import { HeadingLevel } from '@pioneer/frontier';
import { ContentText, contentId, PackId, RichText, Slug } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { richTextJson } from '@pioneer/rules/sdk/testing';
import { asyncProperty, assert } from 'fast-check';
import { describe, expect, it } from 'vitest';

import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { provideRichTextLinks } from './rich-text-links';
import type { RichTextLinks } from './rich-text-links';
import { RichTextView } from './rich-text.component';

const PLAYER_CORE = PackId.parse('player-core');
const OFF_GUARD = contentId(PLAYER_CORE, Slug.parse('off-guard'));
const SEEK = contentId(PLAYER_CORE, Slug.parse('seek'));

const STATISTIC_NAMES: ReadonlyMap<string, ContentText> = new Map([
  ['skill:athletics', ContentText.parse('Athletics')],
  ['save:reflex', ContentText.parse('Reflex')],
]);

/** A page that can open Off-Guard and knows Athletics and Reflex, but not Seek or other statistics. */
const LINKS: RichTextLinks = {
  name: (id: ContentId): ContentText | undefined => (id === OFF_GUARD ? ContentText.parse('Off-Guard') : undefined),
  target: (id: ContentId): readonly string[] | undefined => (id === OFF_GUARD ? ['/content', 'off-guard'] : undefined),
  statisticName: (selector): ContentText | undefined => STATISTIC_NAMES.get(selector),
};

const text = (value: string): unknown => ({ type: 'text', text: value });
const paragraph = (...content: unknown[]): unknown => ({ type: 'paragraph', content });

async function render(json: unknown, headingLevel: HeadingLevel = HeadingLevel.Two): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [provideRichTextTesting(), provideRichTextLinks(LINKS)],
  });
  const fixture = TestBed.createComponent(RichTextView);
  fixture.componentRef.setInput('text', RichText.parse(json));
  fixture.componentRef.setInput('headingLevel', headingLevel);
  await fixture.whenStable();
  const deferred = await fixture.getDeferBlocks();
  await Promise.all(deferred.map(async (block) => block.render(DeferBlockState.Complete)));
  return fixture.nativeElement as HTMLElement;
}

function squash(element: Element | null): string {
  return (element?.textContent ?? '').replaceAll(/\s+/gu, ' ').trim();
}

function paragraphs(rendered: HTMLElement): readonly string[] {
  return [...rendered.querySelectorAll('p')].map((element) => squash(element));
}

/** Every element frontier renders for rich text; author text must never add another. */
const RENDERED_ELEMENTS: ReadonlySet<string> = new Set([
  'a',
  'br',
  'caption',
  'div',
  'em',
  'h2',
  'h3',
  'h4',
  'hr',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
]);

/** Native elements in the rendered text that frontier's rich text components never produce. */
function unexpectedElements(rendered: HTMLElement): readonly string[] {
  const tags = [...rendered.querySelectorAll('*')].map((element) => element.tagName.toLowerCase());
  return tags.filter((tag) => !tag.includes('-') && !RENDERED_ELEMENTS.has(tag));
}

describe(RichTextView, () => {
  it('renders paragraphs with emphasis and strong importance', async () => {
    const rendered = await render([
      paragraph(text('Plain, '), { type: 'text', text: 'stressed', marks: ['emphasis', 'strong'] }),
    ]);

    expect(squash(rendered.querySelector('p'))).toBe('Plain, stressed');
    expect(rendered.querySelector('p strong em')?.textContent).toBe('stressed');
  });

  it('links a reference the page can open, by the entry name', async () => {
    const rendered = await render([paragraph({ type: 'ref', id: OFF_GUARD })]);
    const link = rendered.querySelector('a');

    expect(link?.textContent.trim()).toBe('Off-Guard');
    expect(link?.getAttribute('href')).toBe('/content/off-guard');
  });

  it('shows a reference the page cannot open as text: its label, or a generic name', async () => {
    const rendered = await render([
      paragraph({ type: 'ref', id: SEEK, label: 'Seek' }),
      paragraph({ type: 'ref', id: SEEK }),
    ]);
    expect(rendered.querySelector('a')).toBeNull();
    expect([...rendered.querySelectorAll('p')].map((element) => squash(element))).toStrictEqual([
      'Seek',
      'linked entry',
    ]);
  });

  it('reads checks in words, naming statistics the page knows and generic ones it does not', async () => {
    const rendered = await render([
      paragraph({ type: 'check', statistic: 'skill:athletics', dc: 20 }),
      paragraph({ type: 'check', statistic: 'save:reflex', basic: true }),
      paragraph({ type: 'check', statistic: 'save:fortitude', dc: { against: 'class-dc' } }),
      paragraph({ type: 'check', statistic: 'perception' }),
    ]);

    expect(paragraphs(rendered)).toStrictEqual([
      'DC 20 Athletics',
      'basic Reflex save',
      'saving throw against the listed DC',
      'check',
    ]);
  });

  it('reads damage, healing, areas and durations in words and the viewer’s units', async () => {
    const rendered = await render([
      paragraph({ type: 'damage', instances: [{ formula: '2d6', damageType: 'fire' }] }),
      paragraph({
        type: 'damage',
        instances: [
          { formula: '(@item.level)d6', damageType: 'fire' },
          { formula: '1d6', damageType: 'fire', category: 'persistent' },
        ],
      }),
      paragraph({ type: 'damage', instances: [{ formula: '2d8' }], healing: true }),
      paragraph({ type: 'template', shape: 'burst', size: 20 }),
      paragraph({ type: 'template', shape: 'line', size: 60, width: 10 }),
      paragraph({ type: 'duration', count: 3, unit: 'round' }),
      paragraph({ type: 'duration', count: 1, unit: 'minute' }),
      paragraph({ type: 'damage', instances: [{ formula: '1d4' }], label: 'a little bleeding' }),
    ]);

    expect(paragraphs(rendered)).toStrictEqual([
      '2d6 fire',
      '(@item.level)d6 fire and 1d6 persistent fire',
      '2d8 healing',
      '20 ft burst',
      '60 ft line, 10 ft wide',
      '3 rounds',
      '1 minute',
      'a little bleeding',
    ]);
  });

  it('shows an action glyph hidden from screen readers, which read its name instead', async () => {
    const rendered = await render([paragraph(text('Stride '), { type: 'action-cost', cost: 'two' })]);

    expect(rendered.querySelector('[aria-hidden="true"]')?.textContent.trim()).toBe('◆◆');
    expect(rendered.querySelector('.sr-only')?.textContent.trim()).toBe('Two actions');
  });

  it('breaks a line inside a paragraph', async () => {
    const rendered = await render([paragraph(text('Strength +4'), { type: 'line-break' }, text('Dexterity +2'))]);

    expect(rendered.querySelectorAll('p br')).toHaveLength(1);
  });

  it.each([
    [HeadingLevel.Two, 'h3'],
    [HeadingLevel.Three, 'h4'],
  ])('places a level-2 heading below level %i as an %s', async (headingLevel, tag) => {
    const rendered = await render([{ type: 'heading', level: 2, content: [text('Heightened')] }], headingLevel);

    expect(rendered.querySelector(tag)?.textContent.trim()).toBe('Heightened');
  });

  it('nests lists inside list items', async () => {
    const inner = { type: 'list', ordered: false, items: [[paragraph(text('Inner'))]] };
    const rendered = await render([{ type: 'list', ordered: true, items: [[paragraph(text('Outer')), inner]] }]);

    expect(rendered.querySelector('ol li ul li')?.textContent.trim()).toBe('Inner');
  });

  it('renders a table with rich cells and a generic, hidden name when it has no caption', async () => {
    const rendered = await render([
      {
        type: 'table',
        header: [[text('Rank')], [text('Damage')]],
        rows: [[[text('4th')], [{ type: 'damage', instances: [{ formula: '8d6', damageType: 'fire' }] }]]],
      },
    ]);

    expect(squash(rendered.querySelector('caption'))).toBe('Table');
    expect([...rendered.querySelectorAll('th')].map((cell) => squash(cell))).toStrictEqual(['Rank', 'Damage']);
    expect([...rendered.querySelectorAll('td')].map((cell) => squash(cell))).toStrictEqual(['4th', '8d6 fire']);
  });

  it('only ever renders the elements its frontier components produce, whatever the author wrote', async () => {
    await assert(
      asyncProperty(richTextJson, async (json) => {
        TestBed.resetTestingModule();
        const rendered = await render(json);
        expect(unexpectedElements(rendered)).toStrictEqual([]);
      }),
      { numRuns: 25 },
    );
  });
});
