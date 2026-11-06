import { TestBed } from '@angular/core/testing';
import type { SenseInPlay } from '@pioneer/rules/engine';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import { DWARF_SENSES, FORM_SENSES, SENSE_NAMES } from '../../testing/senses-fixtures';
import { SenseIcons } from './sense-icons.component';

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

async function render(senses: readonly SenseInPlay[] | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(SenseIcons);
  fixture.componentRef.setInput('senses', senses);
  fixture.componentRef.setInput('entryNames', SENSE_NAMES);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe(SenseIcons, () => {
  it('shows a skeleton while the senses load', async () => {
    const host = await render(undefined);

    expect(host.querySelectorAll('fr-skeleton')).toHaveLength(1);
  });

  it('says so when the character has no special senses', async () => {
    const host = await render([]);

    expect(textOf(host)).toBe('No special senses.');
  });

  it('shows each sense as an icon and its name', async () => {
    const host = await render([...DWARF_SENSES, ...FORM_SENSES]);

    expect(textOf(host)).toBe('DarkvisionScent');
    expect(host.querySelectorAll('fr-icon')).toHaveLength(2);
  });
});
