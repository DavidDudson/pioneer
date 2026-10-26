import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EffectStatusKind } from '@pioneer/rules/engine';
import { describe, expect, it } from 'vitest';

import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { provideEntryPreviews } from './entry-preview';
import type { EntryPreview, EntryPreviews } from './entry-preview';
import { EntryPreviewView } from './entry-preview.component';
import {
  CLUMSY_PREVIEW,
  DARKVISION,
  FIREBALL,
  FIREBALL_PREVIEW,
  modifierPreviewEffect,
  notSummarisedPreviewEffect,
  resistancePreviewEffect,
  sensePreviewEffect,
} from './entry-preview.fixtures';

function render(preview: EntryPreview, previews?: EntryPreviews): HTMLElement {
  TestBed.configureTestingModule({
    providers: [
      provideRichTextTesting(),
      provideRouter([]),
      ...(previews === undefined ? [] : [provideEntryPreviews(previews)]),
    ],
  });
  const fixture: ComponentFixture<EntryPreviewView> = TestBed.createComponent(EntryPreviewView);
  fixture.componentRef.setInput('preview', preview);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe(EntryPreviewView, () => {
  it('shows the value beside the name and the statistics the entry changes with it applied', () => {
    const text = render(CLUMSY_PREVIEW).textContent;
    expect(text).toMatch(/Clumsy\s*2/u);
    expect(text).toContain('Changes for this character');
    expect(text).toContain('Armor Class -2 status');
    expect(text).toContain('Reflex -2 status');
  });

  it('says so when the entry changes no statistic', () => {
    expect(render({ ...CLUMSY_PREVIEW, effects: [] }).textContent).toContain('Changes no statistic.');
  });

  it('words a bonus', () => {
    const effects = [modifierPreviewEffect(FIREBALL, { statistic: 'Perception', selector: 'perception', value: 1 })];
    expect(render({ ...FIREBALL_PREVIEW, effects }).textContent).toContain('Perception +1 status');
  });

  it('links the statistic name to its breakdown when the page has one', () => {
    const effects = [modifierPreviewEffect(FIREBALL, { statistic: 'Perception', selector: 'perception', value: 1 })];
    const previews: EntryPreviews = {
      preview: () => undefined,
      statistic: (selector) => ({ to: ['/sheet'], queryParams: { breakdown: selector } }),
    };
    const root = render({ ...FIREBALL_PREVIEW, effects }, previews);
    const link = root.querySelector('a');
    expect(link?.textContent).toBe('Perception');
    expect(link?.getAttribute('href')).toBe('/sheet?breakdown=perception');
    expect(root.textContent).toContain('Perception +1 status');
  });

  it('leaves the statistic name plain when the page has no breakdown', () => {
    const effects = [modifierPreviewEffect(FIREBALL, { statistic: 'Perception', selector: 'perception', value: 1 })];
    expect(render({ ...FIREBALL_PREVIEW, effects }).querySelector('a')).toBeNull();
  });

  it('words a conditional line with what keeps it from counting', () => {
    const effects = [
      modifierPreviewEffect(FIREBALL, {
        statistic: 'Perception',
        selector: 'perception',
        value: 2,
        status: { kind: EffectStatusKind.Conditional, summary: undefined },
      }),
    ];
    expect(render({ ...FIREBALL_PREVIEW, effects }).textContent).toContain('Perception +2 status (Conditional)');
  });

  it('says when a rule element is not summarised yet', () => {
    const effects = [notSummarisedPreviewEffect(FIREBALL)];
    expect(render({ ...FIREBALL_PREVIEW, effects }).textContent).toContain('does not show yet');
  });

  it('names a sense with its acuity and range', () => {
    const effects = [sensePreviewEffect(FIREBALL, { name: 'Darkvision', range: 60 })];
    expect(render({ ...FIREBALL_PREVIEW, effects }).textContent).toContain('Gains Darkvision (precise, 60');
  });

  it('shows a sense by its id when no name was found, and leaves out a range it lacks', () => {
    const effects = [sensePreviewEffect(FIREBALL, {})];
    const text = render({ ...FIREBALL_PREVIEW, effects }).textContent;
    expect(text).toContain(`Gains ${DARKVISION} (precise)`);
  });

  it('names the exceptions of a resistance, else shows their slugs', () => {
    const named = resistancePreviewEffect(FIREBALL, { exceptions: ['cold-iron'], names: ['Cold Iron'] });
    expect(render({ ...FIREBALL_PREVIEW, effects: [named] }).textContent).toContain('except Cold Iron');
  });

  it('shows no effects for an entry the character does not have', () => {
    const text = render(FIREBALL_PREVIEW).textContent;
    expect(text).not.toContain('Changes for this character');
    expect(text).not.toContain('Changes no statistic.');
  });
});
