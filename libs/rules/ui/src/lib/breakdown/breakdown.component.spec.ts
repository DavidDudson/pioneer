import { TestBed } from '@angular/core/testing';
import { BaseTermKind, LineStatusKind, RuleId, SuppressionReason, TermSign } from '@pioneer/rules/engine';
import type { StatisticValue } from '@pioneer/rules/engine';
import { FormulaValue } from '@pioneer/rules/formula';
import { ContentText, ModifierType, OriginHopKind, StatisticKind } from '@pioneer/rules/sdk';
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
  IN_DARKNESS_SUMMARY,
  line,
  MAGE_ARMOR,
  statistic,
  term,
  WITHOUT_LEVEL,
} from '../testing/breakdown-fixtures';
import { climbing } from '../testing/conditional-fixtures';
import { OVERRIDE_STATUSES, PINNED_AC, PINNED_WILL } from '../testing/override-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { BreakdownView } from './breakdown.component';

interface Inputs {
  readonly kind?: StatisticKind;
  readonly entryNames?: ReadonlyMap<ContentId, string>;
  readonly ruleNames?: ReadonlyMap<RuleId, MessageDescriptor>;
}

/** The breakdown as read: its captions and empty line, its terms, and its lines, each list item's parts joined. */
interface Rendered {
  readonly captions: readonly string[];
  readonly terms: readonly string[];
  readonly lines: readonly string[];
  readonly overrides: readonly string[];
  /** Each line's origin chain as a sentence, modifiers then overrides. */
  readonly chains: readonly string[];
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** An item's texts and badges in order, so the parts stay apart. */
function partsOf(item: Element): string {
  return [...item.querySelectorAll('fr-text, fr-badge')]
    .filter((part) => part.querySelector('fr-text, fr-badge') === null && part.closest('pio-origin-chain') === null)
    .map((part) => textOf(part))
    .join(' | ');
}

async function render(
  value: StatisticValue,
  { kind = StatisticKind.Dc, entryNames = ENTRY_NAMES, ruleNames }: Inputs = {},
): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(BreakdownView);
  fixture.componentRef.setInput('statistic', value);
  fixture.componentRef.setInput('kind', kind);
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
    overrides: items('pio-override-lines'),
    chains: [...host.querySelectorAll('pio-origin-chain')].map((chain) =>
      textOf(chain.querySelector('fr-text') ?? chain),
    ),
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
      status: climbing(undefined, undefined),
    });
    const { lines } = await render(statistic('ac', { base: [term('10', 10)], lines: [unsummarised] }));

    expect(lines).toStrictEqual(['Breastplate | +2 item | Conditional']);
  });

  it('names the applied line that beats a conditional one, with or without when it holds', async () => {
    const winner = line(BREASTPLATE, { type: ModifierType.Item, value: 4 });
    const by = winner.modifier.id;
    const worded = line(MAGE_ARMOR, { type: ModifierType.Item, value: 1, status: climbing(IN_DARKNESS_SUMMARY, by) });
    const unworded = line(GOLEM_FORM, { type: ModifierType.Item, value: 2, status: climbing(undefined, by) });
    const { lines } = await render(statistic('ac', { base: [term('10', 10)], lines: [worded, unworded, winner] }));

    expect(lines.slice(1)).toStrictEqual([
      'Mage Armor | +1 item | Conditional | Applies when you are in darkness, but Breastplate already counts for as much.',
      'Golem Form | +2 item | Conditional | Breastplate already counts for as much.',
    ]);
  });

  it('shows two copies of one item as two lines, the lower one suppressed by the other', async () => {
    const winner = line(BREASTPLATE, { type: ModifierType.Item, value: 4 });
    const copy = line(BREASTPLATE, {
      type: ModifierType.Item,
      value: 4,
      status: {
        kind: LineStatusKind.Suppressed,
        by: RuleId.parse(`${BREASTPLATE}#0`),
        reason: SuppressionReason.Stacking,
      },
    });
    const { lines } = await render(statistic('ac', { base: [term('10', 10)], lines: [copy, winner] }));

    expect(lines).toStrictEqual([
      'Breastplate | +4 item',
      'Breastplate | +4 item | Suppressed | Breastplate counts instead.',
    ]);
  });

  it('says which set override pinned the total, and the computed value it hides', async () => {
    const { captions } = await render(PINNED_AC);

    expect(captions).toStrictEqual([
      'Set by the GM pins it to 22; computed 20.',
      'Base 16',
      'Modifiers',
      'Changes and overrides',
    ]);
  });

  it('lists overrides after the modifiers in the order they ran, with what each replaced and left', async () => {
    const { overrides } = await render(PINNED_AC);

    expect(overrides).toStrictEqual([
      'Golem Form | upgrade 16 → 16 | Inactive | Does not apply: its condition does not hold.',
      'Earlier ruling | override 20 → 20 | Set by hand | Replaced | Set by the GM replaces it.',
      'Set by the GM | override 20 → 22 | Set by hand',
    ]);
  });

  it('signs a check’s base, pinned total, computed value and override values', async () => {
    const { captions, overrides } = await render(PINNED_WILL, { kind: StatisticKind.Check });

    expect(captions).toStrictEqual([
      'Set by the GM pins it to +9; computed +6.',
      'Base +6',
      'Modifiers',
      'No modifiers.',
      'Changes and overrides',
    ]);
    expect(overrides).toStrictEqual(['Set by the GM | override +6 → +9 | Set by hand']);
  });

  it('shows where each modifier and override line comes from', async () => {
    const { chains } = await render(PINNED_AC);

    expect(chains).toStrictEqual([
      'Breastplate',
      'Steel Shield',
      'Mage Armor',
      'Frightened',
      'Golem Form',
      'Golem Form',
      expect.stringMatching(/^set by a user .+ → /u),
      expect.stringMatching(/^set by a user .+ → /u),
    ]);
  });

  it('marks nothing pinned and has no overrides caption when there are none', async () => {
    const { captions, overrides } = await render(FIGHTER_AC);

    expect(captions).toStrictEqual(['Base 16', 'Modifiers']);
    expect(overrides).toStrictEqual([]);
  });

  it('words each mode, explains a conditional or failed override, and bases on what an applied Change left', async () => {
    const { captions, overrides } = await render(OVERRIDE_STATUSES);

    expect(captions).toContain('Base 8');
    expect(overrides).toStrictEqual([
      'Breastplate | add 10 → 10 | Conditional | Applies when you are in darkness.',
      'Golem Form | multiply 10 → 10 | Failed | “@item.level” at position 1 has no value.',
      'Mage Armor | downgrade 10 → 8',
      'Mage Armor | add 8 → 8 | Inactive | Does not apply: its condition does not hold.',
    ]);
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
