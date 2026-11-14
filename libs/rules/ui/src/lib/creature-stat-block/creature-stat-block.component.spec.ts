import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Trait, traitId } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { provideEntryPreviews } from '../entry-preview/entry-preview';
import type { EntryPreview } from '../entry-preview/entry-preview';
import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { traitCard } from '../trait-chip/trait-chip.fixtures';
import { StatBlockLayout } from './creature-stat-block';
import type { StatBlockCreature } from './creature-stat-block';
import { CreatureStatBlockView } from './creature-stat-block.component';
import { GIANT_RAT, GOBLIN_WARCHANTER } from './creature-stat-block.fixtures';

function render(creature: StatBlockCreature, layout: StatBlockLayout): string {
  TestBed.configureTestingModule({ providers: [provideRichTextTesting()] });
  const fixture: ComponentFixture<CreatureStatBlockView> = TestBed.createComponent(CreatureStatBlockView);
  fixture.componentRef.setInput('creature', creature);
  fixture.componentRef.setInput('layout', layout);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent;
}

describe(CreatureStatBlockView, () => {
  describe('full', () => {
    it('shows the name, level and perception with its senses', () => {
      const text = render(GOBLIN_WARCHANTER, StatBlockLayout.Full);
      expect(text).toContain('Goblin Warchanter');
      expect(text).toContain('Creature 1');
      expect(text).toMatch(/Perception\s*\+7; Darkvision 60 ft/u);
    });

    it('shows languages and skills', () => {
      const text = render(GOBLIN_WARCHANTER, StatBlockLayout.Full);
      expect(text).toMatch(/Languages\s*Common, Goblin/u);
      expect(text).toMatch(/Skills\s*Acrobatics \+8, Stealth \+8/u);
    });

    it('shows defences and speeds', () => {
      const text = render(GOBLIN_WARCHANTER, StatBlockLayout.Full);
      expect(text).toMatch(/AC\s*17/u);
      expect(text).toMatch(/Saves\s*Fort \+5, Ref \+8, Will \+5/u);
      expect(text).toMatch(/Speed\s*25 ft, climb 10 ft/u);
    });

    it('words strikes with their reach and damage', () => {
      const text = render(GOBLIN_WARCHANTER, StatBlockLayout.Full);
      expect(text).toContain('Melee dogslicer +9');
      expect(text).toContain('reach 5 ft');
      expect(text).toMatch(/Damage\s*1d6\+2 slashing/u);
      expect(text).toContain('range increment 60 ft');
    });

    it('shows abilities with their trigger and frequency', () => {
      const text = render(GOBLIN_WARCHANTER, StatBlockLayout.Full);
      expect(text).toContain('Goblin Scuttle');
      expect(text).toContain('An ally ends a move adjacent to the goblin.');
      expect(text).toMatch(/Frequency\s*1 per round/u);
    });

    it('shows spellcasting and recall knowledge', () => {
      const text = render(GOBLIN_WARCHANTER, StatBlockLayout.Full);
      expect(text).toContain('Primal Innate spells');
      expect(text).toContain('DC 17, attack +9');
      expect(text).toContain('Recall Knowledge');
    });

    it('leaves out parts the creature lacks', () => {
      const text = render(GIANT_RAT, StatBlockLayout.Full);
      expect(text).not.toContain('Languages');
      expect(text).not.toContain('Skills');
      expect(text).not.toContain('Immunities');
      expect(text).not.toContain('Recall Knowledge');
    });
  });

  describe('preview', () => {
    it('keeps to the numbers and Strikes a glance needs', () => {
      const text = render(GOBLIN_WARCHANTER, StatBlockLayout.Preview);
      expect(text).toContain('Goblin Warchanter');
      expect(text).toMatch(/AC\s*17/u);
      expect(text).toContain('Melee dogslicer +9');
    });

    it('leaves out abilities, spellcasting and recall knowledge', () => {
      const text = render(GOBLIN_WARCHANTER, StatBlockLayout.Preview);
      expect(text).not.toContain('Goblin Scuttle');
      expect(text).not.toContain('Primal Innate spells');
      expect(text).not.toContain('Recall Knowledge');
    });
  });

  describe('traits', () => {
    const GOBLIN = Trait.parse('goblin');
    const previews = provideEntryPreviews({
      preview: (id): EntryPreview | undefined =>
        id === traitId(GOBLIN) ? traitCard('Goblin', 'Goblins are a short, scrappy people.') : undefined,
    });

    function renderWithCards(): ComponentFixture<CreatureStatBlockView> {
      TestBed.configureTestingModule({ providers: [provideRichTextTesting(), previews] });
      const fixture = TestBed.createComponent(CreatureStatBlockView);
      fixture.componentRef.setInput('creature', GOBLIN_WARCHANTER);
      fixture.detectChanges();
      return fixture;
    }

    it('shows each trait as a chip after the size, which is no trait', () => {
      const root = renderWithCards().nativeElement as HTMLElement;
      const traits = [...root.querySelectorAll('pio-trait-chip')].map((each) => each.textContent.trim());

      expect(traits.slice(0, GOBLIN_WARCHANTER.traits.length)).toStrictEqual(['Goblin', 'Humanoid']);
      expect(root.textContent).toContain('Small');
    });

    it('opens the trait card from the chip', async () => {
      const fixture = renderWithCards();
      const root = fixture.nativeElement as HTMLElement;
      const stop = [...root.querySelectorAll<HTMLElement>('[tabindex="0"]')].find(
        (each) => each.textContent.trim() === 'Goblin',
      );
      stop?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('scrappy people');
      });
    });

    it('shows the traits of an ability as chips', () => {
      const root = renderWithCards().nativeElement as HTMLElement;
      const ability = GOBLIN_WARCHANTER.data.abilities?.find((each) => each.traits.length > 0);

      expect(ability).toBeDefined();
      expect(root.querySelectorAll('pio-stat-abilities pio-trait-chip').length).toBeGreaterThan(0);
    });
  });

  describe('strike traits', () => {
    const AGILE = Trait.parse('agile');
    const previews = provideEntryPreviews({
      preview: (id): EntryPreview | undefined =>
        id === traitId(AGILE) ? traitCard('Agile', 'The attack penalty for multiple attacks is lower.') : undefined,
    });

    function renderStrikes(): ComponentFixture<CreatureStatBlockView> {
      TestBed.configureTestingModule({ providers: [provideRichTextTesting(), previews] });
      const fixture = TestBed.createComponent(CreatureStatBlockView);
      fixture.componentRef.setInput('creature', GOBLIN_WARCHANTER);
      fixture.detectChanges();
      return fixture;
    }

    it('reads the same as the joined text it replaced', () => {
      const text = (renderStrikes().nativeElement as HTMLElement).textContent.replaceAll(/\s+/gu, ' ');

      expect(text).toContain('Melee dogslicer +9 (reach 5 ft, Agile, Backstabber)');
      expect(text).toContain('Ranged shortbow +9 (range increment 60 ft, Deadly d10)');
    });

    it('shows each real trait as a chip and the reach as plain text', () => {
      const root = renderStrikes().nativeElement as HTMLElement;
      const chips = [...root.querySelectorAll('pio-stat-strikes pio-trait-chip')].map((each) =>
        each.textContent.trim(),
      );

      expect(chips).toStrictEqual(['Agile', 'Backstabber', 'Deadly d10']);
    });

    it('opens the trait card from the chip', async () => {
      const fixture = renderStrikes();
      const root = fixture.nativeElement as HTMLElement;
      const stop = [...root.querySelectorAll<HTMLElement>('pio-stat-strikes [tabindex="0"]')].find(
        (each) => each.textContent.trim() === 'Agile',
      );
      stop?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('multiple attacks is lower');
      });
    });

    it('keeps no brackets for a Strike with nothing to list', () => {
      const root = renderStrikes().nativeElement as HTMLElement;

      expect(root.textContent).not.toContain('()');
    });
  });
});
