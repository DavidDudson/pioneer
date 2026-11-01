import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActionStatus } from '@pioneer/rules/engine';
import { RichText } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import { describe, expect, it, vi } from 'vitest';

import { provideEntryPreviews } from '../entry-preview/entry-preview';
import type { EntryPreviews, PanelLink } from '../entry-preview/entry-preview';
import { SHIELD_BLOCK_SUMMARY } from '../testing/action-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ActionLine } from './action-line';
import { ActionRow } from './action-row.component';
import { ActionWords } from './action-words';

const PANEL: PanelLink = { to: ['/characters', 'sheet'], queryParams: { drawer: 'open', se: 'action:stride' } };

function paragraph(text: string): RichText {
  return RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text }] }]);
}

const STRIDE: ActionLine = {
  ...SHIELD_BLOCK_SUMMARY.line,
  trigger: paragraph('An enemy comes within reach.'),
  requirements: paragraph('You have a free hand.'),
  effect: RichText.parse([
    ...paragraph('You move up to your Speed.'),
    ...paragraph('Heightened: a second paragraph the summary trims.'),
  ]),
  status: ActionStatus.Unavailable,
  reasons: [message('rules.actions.status.unavailable')],
};

function render(panel: PanelLink | undefined): ComponentFixture<ActionRow> {
  const previews: EntryPreviews = { preview: (): undefined => undefined, panel: () => panel };
  TestBed.configureTestingModule({
    providers: [provideRulesUiI18nTesting(), provideRouter([]), provideEntryPreviews(previews)],
  });
  const fixture = TestBed.createComponent(ActionRow);
  fixture.componentRef.setInput('action', TestBed.inject(ActionWords).shown(STRIDE));
  fixture.detectChanges();
  return fixture;
}

function card(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="tooltip"]');
}

/** Focuses the name, which is where a keyboard reaches the summary. */
async function focusName(fixture: ComponentFixture<ActionRow>): Promise<void> {
  const name = (fixture.nativeElement as HTMLElement).querySelector('[tabindex="0"], a');
  name?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(card()).not.toBeNull();
  });
}

describe('ActionRow summary', () => {
  it('shows the trigger, requirements and the opening of the effect on focus', async () => {
    const fixture = render(PANEL);
    await focusName(fixture);
    expect(card()?.textContent).toContain('An enemy comes within reach.');
    expect(card()?.textContent).toContain('You have a free hand.');
    expect(card()?.textContent).toContain('You move up to your Speed.');
    expect(card()?.textContent).not.toContain('second paragraph');
  });

  it('says why the action is not plainly available', async () => {
    const fixture = render(undefined);
    await focusName(fixture);
    expect(card()?.textContent).toContain('Unavailable');
  });
});

describe('ActionRow panel link', () => {
  it('links the name to the page with the side panel open on the action', () => {
    const fixture = render(PANEL);
    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link?.getAttribute('href')).toBe('/characters/sheet?drawer=open&se=action:stride');
  });

  it('leaves the name plain, and still focusable, when the page has no panel', () => {
    const fixture = render(undefined);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('a')).toBeNull();
    expect(host.querySelector('[tabindex="0"]')?.textContent).toContain('Shield Block');
  });

  it('does not put the roll or use controls inside the link', () => {
    const fixture = render(PANEL);
    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link?.querySelector('button')).toBeNull();
  });
});
