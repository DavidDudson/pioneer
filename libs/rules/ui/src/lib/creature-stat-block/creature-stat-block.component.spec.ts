import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
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
});
