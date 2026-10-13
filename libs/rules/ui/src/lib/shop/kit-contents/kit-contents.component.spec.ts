import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import type { KitLine } from '../shop-offer';
import { KitContents } from './kit-contents.component';
import { kitLine } from './kit-contents.fixtures';

async function render(lines: readonly KitLine[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(KitContents);
  fixture.componentRef.setInput('lines', lines);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** Each line's own text, indented by how deep its list is. */
const shown = (host: HTMLElement): string[] =>
  [...host.querySelectorAll('pio-entry-hover > fr-text')].map((text) => {
    let depth = 0;
    for (let at = text.parentElement; at !== null && at !== host; at = at.parentElement) {
      depth += at.tagName === 'FR-LIST' ? 1 : 0;
    }
    return `${'  '.repeat(depth - 1)}${text.textContent.trim()}`;
  });

describe(KitContents, () => {
  it('lists each item with how many, what a container holds under it', async () => {
    const host = await render([
      kitLine('Backpack', 1, [kitLine('Rope', 1), kitLine('Torch', 5)]),
      kitLine('Longsword', 2),
    ]);
    expect(shown(host)).toStrictEqual(['Backpack', '  Rope', '  5 × Torch', '2 × Longsword']);
  });
});
