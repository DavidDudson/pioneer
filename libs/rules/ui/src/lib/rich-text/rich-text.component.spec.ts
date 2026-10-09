import { TestBed } from '@angular/core/testing';
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

/** A page that can open Off-Guard and knows Athletics, but not Seek. */
const LINKS: RichTextLinks = {
  name: (id: ContentId): ContentText | undefined => (id === OFF_GUARD ? ContentText.parse('Off-Guard') : undefined),
  target: (id: ContentId): readonly string[] | undefined => (id === OFF_GUARD ? ['/content', 'off-guard'] : undefined),
  statisticName: (selector): ContentText | undefined =>
    selector === 'skill:athletics' ? ContentText.parse('Athletics') : undefined,
};

const text = (value: string): unknown => ({ type: 'text', text: value });
const paragraph = (...content: unknown[]): unknown => ({ type: 'paragraph', content });

async function render(json: unknown): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [provideRichTextTesting(), provideRichTextLinks(LINKS)],
  });
  const fixture = TestBed.createComponent(RichTextView);
  fixture.componentRef.setInput('text', RichText.parse(json));
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function squash(element: Element | null): string {
  return (element?.textContent ?? '').replaceAll(/\s+/gu, ' ').trim();
}

describe(RichTextView, () => {
  it('renders paragraphs with emphasis and strong importance', async () => {
    const rendered = await render([
      paragraph(text('Plain, '), { type: 'text', text: 'stressed', marks: ['emphasis', 'strong'] }),
    ]);

    expect(squash(rendered.querySelector('p'))).toBe('Plain, stressed');
    expect(rendered.querySelector('p strong em')?.textContent).toBe('stressed');
  });

  it('places description headings one level below the entry title', async () => {
    const rendered = await render([{ type: 'heading', level: 1, content: [text('Heightened')] }]);

    expect(rendered.querySelector('h2')?.textContent.trim()).toBe('Heightened');
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

  it('reads checks, damage, areas and durations in words', async () => {
    const rendered = await render([
      paragraph({ type: 'check', statistic: 'skill:athletics', dc: 20 }),
      paragraph({ type: 'check', statistic: 'save:reflex', basic: true }),
      paragraph({ type: 'damage', formula: '2d6', damageType: 'fire' }),
      paragraph({ type: 'template', shape: 'burst', size: 20 }),
      paragraph({ type: 'duration', count: 3, unit: 'round' }),
      paragraph({ type: 'duration', count: 1, unit: 'minute' }),
      paragraph({ type: 'damage', formula: '1d4', label: 'a little bleeding' }),
    ]);

    expect([...rendered.querySelectorAll('p')].map((element) => squash(element))).toStrictEqual([
      'DC 20 Athletics',
      'basic save:reflex',
      '2d6 fire',
      '20-foot burst',
      '3 rounds',
      '1 minute',
      'a little bleeding',
    ]);
  });

  it('shows an action glyph spelled out for screen readers', async () => {
    const rendered = await render([paragraph(text('Stride '), { type: 'action-cost', cost: 'two' })]);
    const glyph = rendered.querySelector('abbr');

    expect(glyph?.textContent.trim()).toBe('◆◆');
    expect(glyph?.getAttribute('title')).toBe('Two actions');
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
        rows: [[[text('4th')], [{ type: 'damage', formula: '8d6', damageType: 'fire' }]]],
      },
    ]);

    expect(squash(rendered.querySelector('caption'))).toBe('Table');
    expect([...rendered.querySelectorAll('th')].map((cell) => squash(cell))).toStrictEqual(['Rank', 'Damage']);
    expect([...rendered.querySelectorAll('td')].map((cell) => squash(cell))).toStrictEqual(['4th', '8d6 fire']);
  });

  it('never turns author text into markup', async () => {
    await assert(
      asyncProperty(richTextJson, async (json) => {
        TestBed.resetTestingModule();
        const rendered = await render(json);
        expect(rendered.querySelector('script, b, i, img, iframe')).toBeNull();
      }),
      { numRuns: 25 },
    );
  });
});
