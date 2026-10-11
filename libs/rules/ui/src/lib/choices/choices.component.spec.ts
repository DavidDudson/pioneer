import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ELF_CHOICES } from '../testing/choices-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ChoiceLine } from './choice-line';
import { ChoicesView } from './choices.component';

async function render(lines: readonly ChoiceLine[] | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<ChoicesView> = TestBed.createComponent(ChoicesView);
  fixture.componentRef.setInput('lines', lines);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** Each listed choice as its texts: label, pick, badge, then the reason when there is one. */
function rows(host: HTMLElement): string[][] {
  return [...host.querySelectorAll('fr-list-item')].map((item) =>
    [...item.querySelectorAll('fr-text, fr-badge')].map((part) => part.textContent.trim()),
  );
}

describe(ChoicesView, () => {
  it('lists each choice with its pick and a badge naming its state', async () => {
    const host = await render(ELF_CHOICES);
    expect(rows(host).slice(0, 4)).toStrictEqual([
      ['Ancestry', 'Elf', 'Chosen'],
      ['Background', 'Not chosen'],
      ['Level 1 boost', 'Dexterity', 'Chosen'],
      ['Level 5 boost', 'Strength', 'Planned for level 5'],
    ]);
  });

  it('flags an invalid choice with its reason, at its level when it is planned', async () => {
    const shown = rows(await render(ELF_CHOICES));
    const [plannedInvalid, invalid] = shown.slice(4, 6);
    expect(plannedInvalid).toStrictEqual([
      'Level 5 boost',
      'Strength',
      'Needs a new choice at level 5',
      'A boost given with this one already raises that attribute, so it counts for nothing. Choose another.',
    ]);
    expect(invalid).toStrictEqual([
      'Elf: Skill',
      'Stealth',
      'Needs a new choice',
      'This choice no longer offers that option, so it counts for nothing. Choose another.',
    ]);
  });

  it('keeps a pick for a choice the character no longer has, marked as kept', async () => {
    const hidden = rows(await render(ELF_CHOICES)).at(-1);
    expect(hidden).toStrictEqual(['A choice the character no longer has', 'Cavern', 'Kept, not on the character']);
  });

  it('shows placeholders while loading, and an empty state with no choices', async () => {
    const loading = await render(undefined);
    expect(loading.querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
    TestBed.resetTestingModule();
    const empty = await render([]);
    expect(empty.textContent).toContain('No choices yet.');
  });
});
