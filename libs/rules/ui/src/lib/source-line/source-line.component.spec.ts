import { TestBed } from '@angular/core/testing';
import { PackId, SourceRef } from '@pioneer/rules/sdk';
import type { UserId as UserIdType } from '@pioneer/shared/kernel';
import { UserId } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { SourceLineView } from './source-line.component';

const AUTHOR = UserId.parse('0b6f1c9e-4f8a-4d3b-9a51-6b0e8f2c7d14');
const PACK = PackId.parse('lost-lands');
const AON_HUMAN = 'https://2e.aonprd.com/Ancestries.aspx?ID=64';

interface Rendered {
  readonly line: HTMLElement;
  readonly links: readonly HTMLAnchorElement[];
}

async function render(
  sources: readonly unknown[],
  names: { readonly authors?: ReadonlyMap<UserIdType, string>; readonly packs?: ReadonlyMap<PackId, string> } = {},
): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(SourceLineView);
  fixture.componentRef.setInput(
    'sources',
    sources.map((source) => SourceRef.parse(source)),
  );
  if (names.authors !== undefined) {
    fixture.componentRef.setInput('authorNames', names.authors);
  }
  if (names.packs !== undefined) {
    fixture.componentRef.setInput('packNames', names.packs);
  }
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const line = host.querySelector('p');
  if (line === null) {
    throw new Error('pio-source-line rendered no <p>');
  }
  return { line, links: [...line.querySelectorAll('a')] };
}

describe(SourceLineView, () => {
  describe('book sources', () => {
    it('shows the title, the page and an AoN link named for the book and page', async () => {
      const { line, links } = await render([{ kind: 'book', book: 'player-core', page: 46, aon: AON_HUMAN }]);

      expect(line.textContent).toBe('Player Core p. 46 · AoN');
      expect(links).toHaveLength(1);
      expect(links[0]?.getAttribute('href')).toBe(AON_HUMAN);
      expect(links[0]?.textContent).toBe('AoN');
      expect(links[0]?.getAttribute('aria-label')).toBe('AoN: Player Core page 46 on Archives of Nethys');
    });

    it('shows a book with a page but no AoN entry without a link', async () => {
      const { line, links } = await render([{ kind: 'book', book: 'gm-core', page: 12 }]);

      expect(line.textContent).toBe('GM Core p. 12');
      expect(links).toHaveLength(0);
    });

    it('names the AoN link for the book alone when there is no page', async () => {
      const { line, links } = await render([{ kind: 'book', book: 'monster-core', aon: AON_HUMAN }]);

      expect(line.textContent).toBe('Monster Core · AoN');
      expect(links[0]?.getAttribute('aria-label')).toBe('AoN: Monster Core on Archives of Nethys');
    });

    it('formats the page number for the locale', async () => {
      const { line } = await render([{ kind: 'book', book: 'player-core', page: 1234 }]);

      expect(line.textContent).toBe('Player Core p. 1,234');
    });

    it('names a book the registry does not know by its id', async () => {
      const { line } = await render([{ kind: 'book', book: 'lost-omens-legends', page: 3 }]);

      expect(line.textContent).toBe('Unknown book “lost-omens-legends” p. 3');
    });
  });

  describe('web sources', () => {
    it('links the title to the page', async () => {
      const url = 'https://paizo.com/community/blog/v5748dyo6shmo';
      const { line, links } = await render([{ kind: 'web', url, title: 'Remaster errata' }]);

      expect(line.textContent).toBe('Remaster errata');
      expect(links[0]?.getAttribute('href')).toBe(url);
      expect(links[0]?.getAttribute('rel')).toBe('noopener');
    });

    it('links the host when the source has no title', async () => {
      const { line, links } = await render([{ kind: 'web', url: 'https://www.example.com/rules/flanking' }]);

      expect(line.textContent).toBe('www.example.com');
      expect(links[0]?.getAttribute('href')).toBe('https://www.example.com/rules/flanking');
    });
  });

  describe('homebrew sources', () => {
    it('shows the pack and author names the caller passes in', async () => {
      const { line, links } = await render([{ kind: 'homebrew', pack: PACK, author: AUTHOR }], {
        authors: new Map([[AUTHOR, 'Ezren']]),
        packs: new Map([[PACK, 'The Lost Lands']]),
      });

      expect(line.textContent).toBe('The Lost Lands by Ezren');
      expect(links).toHaveLength(0);
    });

    it('links the pack name when the source has a URL', async () => {
      const url = 'https://example.com/lost-lands';
      const { line, links } = await render([{ kind: 'homebrew', pack: PACK, author: AUTHOR, url }], {
        packs: new Map([[PACK, 'The Lost Lands']]),
      });

      expect(line.textContent).toBe('The Lost Lands by an unknown author');
      expect(links[0]?.textContent).toBe('The Lost Lands');
      expect(links[0]?.getAttribute('href')).toBe(url);
    });

    it('falls back to the pack id and an unknown author without names', async () => {
      const { line } = await render([{ kind: 'homebrew', pack: PACK, author: AUTHOR }]);

      expect(line.textContent).toBe('lost-lands by an unknown author');
    });
  });

  it('joins several sources in order', async () => {
    const { line, links } = await render([
      { kind: 'book', book: 'player-core', page: 46, aon: AON_HUMAN },
      { kind: 'web', url: 'https://paizo.com/errata', title: 'Errata' },
      { kind: 'homebrew', pack: PACK, author: AUTHOR },
    ]);

    expect(line.textContent).toBe('Player Core p. 46 · AoN; Errata; lost-lands by an unknown author');
    expect(links.map((link) => link.textContent)).toStrictEqual(['AoN', 'Errata']);
  });
});
