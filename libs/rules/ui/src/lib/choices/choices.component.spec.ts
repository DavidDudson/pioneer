import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { SlotKey } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { ELF_CHOICES } from '../testing/choices-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ChoiceLine } from './choice-line';
import { ChoicesView } from './choices.component';
import type { ChoiceLockChange } from './choices.component';

async function render(lines: readonly ChoiceLine[] | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<ChoicesView> = TestBed.createComponent(ChoicesView);
  fixture.componentRef.setInput('lines', lines);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

interface LockableRender {
  readonly host: HTMLElement;
  readonly changes: ChoiceLockChange[];
}

/** The component with lockable choices, `locked` of them kept, and the toggles pressed so far. */
async function renderLockable(locked: ReadonlySet<SlotKey>): Promise<LockableRender> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<ChoicesView> = TestBed.createComponent(ChoicesView);
  const changes: ChoiceLockChange[] = [];
  fixture.componentInstance.lockChange.subscribe((change) => {
    changes.push(change);
  });
  fixture.componentRef.setInput('lines', ELF_CHOICES);
  fixture.componentRef.setInput('lockable', true);
  fixture.componentRef.setInput('locked', locked);
  await fixture.whenStable();
  return { host: fixture.nativeElement as HTMLElement, changes };
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

  it('offers no keep toggle unless the list is lockable', async () => {
    const host = await render(ELF_CHOICES);
    expect(host.querySelectorAll('fr-toggle-button')).toHaveLength(0);
  });

  it('offers a keep toggle on each chosen choice only, named by its choice', async () => {
    const { host } = await renderLockable(new Set());
    const labels = [...host.querySelectorAll('fr-toggle-button button')].map((button) =>
      button.getAttribute('aria-label'),
    );
    expect(labels).toStrictEqual(['Keep Ancestry when re-rolling', 'Keep Level 1 boost when re-rolling']);
  });

  it('shows a kept choice pressed and reports a press with its slot', async () => {
    const ancestry = SlotKey.parse('ancestry');
    const { host, changes } = await renderLockable(new Set([ancestry]));
    const [kept, loose] = [...host.querySelectorAll<HTMLButtonElement>('fr-toggle-button button')];
    expect(kept?.getAttribute('aria-pressed')).toBe('true');
    expect(loose?.getAttribute('aria-pressed')).toBe('false');
    kept?.click();
    expect(changes).toStrictEqual([{ slot: ancestry, locked: false }]);
  });
});
