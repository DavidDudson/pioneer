import { TestBed } from '@angular/core/testing';
import { BaseTermKind, LineStatusKind, RuleId, SuppressionReason, TermSign } from '@pioneer/rules/engine';
import type { StatisticValue } from '@pioneer/rules/engine';
import { FormulaValue } from '@pioneer/rules/formula';
import { ContentText, ModifierType, OriginHopKind, Predicate } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import {
  BREASTPLATE,
  ENTRY_NAMES,
  FIGHTER_AC,
  FIGHTER_WILL,
  GOLEM_FORM,
  IN_DARKNESS,
  line,
  MAGE_ARMOR,
  statistic,
  term,
  WITHOUT_LEVEL,
} from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { BreakdownView } from './breakdown.component';

interface Inputs {
  readonly entryNames?: ReadonlyMap<ContentId, string>;
  readonly ruleNames?: ReadonlyMap<RuleId, MessageDescriptor>;
}

/** The breakdown as read: its captions and empty line, its terms, and its lines, each list item's parts joined. */
interface Rendered {
  readonly captions: readonly string[];
  readonly terms: readonly string[];
  readonly lines: readonly string[];
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** An item's texts and badges in order, so the parts stay apart. */
function partsOf(item: Element): string {
  return [...item.querySelectorAll('fr-text, fr-badge')]
    .filter((part) => part.querySelector('fr-text, fr-badge') === null)
    .map((part) => textOf(part))
    .join(' | ');
}

async function render(value: StatisticValue, { entryNames = ENTRY_NAMES, ruleNames }: Inputs = {}): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(BreakdownView);
  fixture.componentRef.setInput('statistic', value);
  fixture.componentRef.setInput('entryNames', entryNames);
  if (ruleNames !== undefined) {
    fixture.componentRef.setInput('ruleNames', ruleNames);
  }
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const items = (selector: string): string[] =>
    [...host.querySelectorAll(`${selector} [role="listitem"]`)].map((item) => partsOf(item));
  return {
    captions: [...host.querySelectorAll('fr-text')]
      .filter((caption) => caption.closest('fr-list') === null)
      .map((caption) => textOf(caption)),
    terms: items('pio-base-terms'),
    lines: items('pio-breakdown-lines'),
  };
}

describe(BreakdownView, () => {
  it('shows the base and the terms that give it, then says when nothing modifies it', async () => {
    const { captions, terms, lines } = await render(FIGHTER_WILL);

    expect(captions).toStrictEqual(['Base 6', 'Modifiers', 'No modifiers.']);
    expect(terms).toStrictEqual(['@attr.wis | gives 1', '+ @prof.save.will | gives 5']);
    expect(lines).toStrictEqual([]);
  });

  it('writes a subtracted term with its minus, and a rounding line', async () => {
    const rounding = { kind: BaseTermKind.Rounding, value: FormulaValue.parse(-1) } as const;
    const { terms } = await render(
      statistic('speed:land', { base: [term('25', 25), term('@armor.penalty', -5, TermSign.Minus), rounding] }),
    );

    expect(terms).toStrictEqual(['25 | gives 25', '- @armor.penalty | gives -5', 'Rounding | gives -1']);
  });

  it('names the variant rule that sets a proficiency term', async () => {
    const variant = {
      ...term('@prof.ac', 2),
      origin: { hops: [{ kind: OriginHopKind.Variant, rule: WITHOUT_LEVEL }], entry: WITHOUT_LEVEL, sources: [] },
    };
    const { terms } = await render(statistic('ac', { base: [term('10', 10), variant] }));

    expect(terms).toStrictEqual(['10 | gives 10', '+ @prof.ac | gives 2 | Set by Proficiency Without Level.']);
  });

  it('lists applied lines first, then conditional, suppressed, inactive and failed, each explained', async () => {
    const { captions, lines } = await render(FIGHTER_AC);

    expect(captions).toStrictEqual(['Base 16', 'Modifiers']);
    expect(lines).toStrictEqual([
      'Breastplate | +4 item',
      'Steel Shield | +2 circumstance | Conditional | Applies when your shield is raised.',
      'Mage Armor | +1 item | Suppressed | Breastplate counts instead.',
      'Frightened | -1 status | Inactive | Does not apply: its condition does not hold.',
      'Golem Form | untyped | Failed | “@item.level” at position 1 has no value.',
    ]);
  });

  it('says what removed a line an adjustment suppressed', async () => {
    const removed = line(MAGE_ARMOR, {
      type: ModifierType.Item,
      value: 1,
      status: {
        kind: LineStatusKind.Suppressed,
        by: RuleId.parse(`${GOLEM_FORM}#3`),
        reason: SuppressionReason.Adjustment,
      },
    });
    const { lines } = await render(statistic('ac', { base: [term('10', 10)], lines: [removed] }), {
      ruleNames: new Map([[RuleId.parse(`${GOLEM_FORM}#3`), message('rules.breakdown.modifiers')]]),
    });

    expect(lines).toStrictEqual(['Mage Armor | +1 item | Suppressed | Modifiers removes it.']);
  });

  it('words a generated condition and shows +0 with its sign', async () => {
    const dark = line(BREASTPLATE, { type: ModifierType.Circumstance, value: 0, status: IN_DARKNESS });
    const { lines } = await render(statistic('ac', { base: [term('10', 10)], lines: [dark] }));

    expect(lines).toStrictEqual(['Breastplate | +0 circumstance | Conditional | Applies when you are in darkness.']);
  });

  it('leaves out the detail of a conditional line with no summary', async () => {
    const unsummarised = line(BREASTPLATE, {
      type: ModifierType.Item,
      value: 2,
      status: { kind: LineStatusKind.Conditional, when: Predicate.parse(['lighting:darkness']), summary: undefined },
    });
    const { lines } = await render(statistic('ac', { base: [term('10', 10)], lines: [unsummarised] }));

    expect(lines).toStrictEqual(['Breastplate | +2 item | Conditional']);
  });

  describe('names', () => {
    const labelled = line(BREASTPLATE, {
      type: ModifierType.Item,
      value: 4,
      label: { text: ContentText.parse('Armor') },
    });
    const unlabelled = line(GOLEM_FORM, { type: ModifierType.Status, value: 1 });
    const engine = line(MAGE_ARMOR, {
      type: ModifierType.Item,
      value: 1,
      label: { message: message('engine.modifier.weaponPotency', { weapon: 'longsword' }) },
    });
    const value = statistic('ac', { base: [term('10', 10)], lines: [labelled, unlabelled, engine] });

    it('calls a line by its label, else its entry name, else the engine’s message', async () => {
      const { lines } = await render(value);

      expect(lines).toStrictEqual(['Armor | +4 item', 'Golem Form | +1 status', 'Item bonus of longsword | +1 item']);
    });

    it('prefers the caller’s rule name over the entry name, never over a label', async () => {
      const ruleNames = new Map([
        [RuleId.parse(`${BREASTPLATE}#0`), message('rules.breakdown.rounding')],
        [RuleId.parse(`${GOLEM_FORM}#0`), message('rules.breakdown.modifiers')],
      ]);
      const { lines } = await render(value, { ruleNames });

      expect(lines).toStrictEqual(['Armor | +4 item', 'Modifiers | +1 status', 'Item bonus of longsword | +1 item']);
    });

    it('shows an entry’s id when it has no name', async () => {
      const { lines } = await render(value, { entryNames: new Map() });

      expect(lines[1]).toBe(`${GOLEM_FORM} | +1 status`);
    });
  });
});
