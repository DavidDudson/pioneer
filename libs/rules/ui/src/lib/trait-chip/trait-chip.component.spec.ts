import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { BadgeTone } from '@pioneer/frontier';
import { traitId } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { provideEntryPreviews } from '../entry-preview/entry-preview';
import type { EntryPreview, EntryPreviews } from '../entry-preview/entry-preview';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { TraitChip } from './trait-chip.component';
import { DEADLY_D8, FIRE, HELD_TRAIT_PREVIEWS, MANIPULATE, NOT_A_TRAIT } from './trait-chip.fixtures';

async function render(previews: EntryPreviews, inputs: Record<string, unknown>): Promise<ComponentFixture<TraitChip>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting(), provideEntryPreviews(previews)] });
  const fixture = TestBed.createComponent(TraitChip);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture;
}

const text = (fixture: ComponentFixture<unknown>): string => (fixture.nativeElement as HTMLElement).textContent.trim();

const stops = (fixture: ComponentFixture<unknown>): NodeListOf<Element> =>
  (fixture.nativeElement as HTMLElement).querySelectorAll('[tabindex="0"]');

describe(TraitChip, () => {
  it('shows the producer label before anything else', async () => {
    const fixture = await render(HELD_TRAIT_PREVIEWS, { trait: FIRE, label: 'Flame' });

    expect(text(fixture)).toBe('Flame');
  });

  it('shows the loaded entry name when the producer gave none', async () => {
    const fixture = await render(HELD_TRAIT_PREVIEWS, { trait: DEADLY_D8 });

    expect(text(fixture)).toBe('Deadly d8');
  });

  it('reads the slug as words when no name is known, never the raw slug', async () => {
    const fixture = await render(HELD_TRAIT_PREVIEWS, { trait: NOT_A_TRAIT });

    expect(text(fixture)).toBe('Not a trait');
  });

  it('is a plain chip, with no tab stop and no error, for a slug the page cannot preview', async () => {
    const fixture = await render(HELD_TRAIT_PREVIEWS, { trait: NOT_A_TRAIT });

    expect(stops(fixture)).toHaveLength(0);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('fr-badge')).toHaveLength(1);
  });

  it('wears the tone it is given', async () => {
    const fixture = await render(HELD_TRAIT_PREVIEWS, { trait: FIRE, tone: BadgeTone.Warning });

    expect((fixture.nativeElement as HTMLElement).querySelector('fr-badge span')?.className).toContain('warning');
  });

  it('opens the trait card when focused, and shows its text', async () => {
    const fixture = await render(HELD_TRAIT_PREVIEWS, { trait: FIRE });

    expect(stops(fixture)).toHaveLength(1);
    stops(fixture)[0]?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('deal fire damage');
    });
  });

  it('opens a trait with no text on a card that names it', async () => {
    const fixture = await render(HELD_TRAIT_PREVIEWS, { trait: MANIPULATE });

    stops(fixture)[0]?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Manipulate');
    });
  });

  it('fetches the trait when the page holds none, and names an unknown one as missing', async () => {
    const load = vi.fn<(id: ContentId) => Promise<EntryPreview | undefined>>(async () => undefined);
    const fixture = await render({ preview: (): undefined => undefined, load }, { trait: NOT_A_TRAIT });

    stops(fixture)[0]?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(load).toHaveBeenCalledWith(traitId(NOT_A_TRAIT));
    });
  });
});
