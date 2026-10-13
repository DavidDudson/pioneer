import { TestBed } from '@angular/core/testing';
import type { RuleId, StatisticValue } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { BreakdownView } from '../breakdown/breakdown.component';
import type { OriginNames } from '../origin-chain/origin-names';
import { ENTRY_NAMES } from './breakdown-fixtures';
import { provideRulesUiI18nTesting } from './provide-rich-text-testing';

export interface Inputs {
  readonly kind?: StatisticKind;
  readonly entryNames?: ReadonlyMap<ContentId, string>;
  readonly ruleNames?: ReadonlyMap<RuleId, MessageDescriptor>;
  readonly originNames?: OriginNames;
}

/** The breakdown as read: its captions and empty line, its terms, and its lines, each list item's parts joined. */
export interface Rendered {
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

/** The inputs `render` sets: the optional ones only when given. */
function inputsOf(
  value: StatisticValue,
  { kind = StatisticKind.Dc, entryNames = ENTRY_NAMES, ruleNames, originNames }: Inputs,
): Readonly<Record<string, unknown>> {
  return {
    statistic: value,
    kind,
    entryNames,
    ...(ruleNames === undefined ? {} : { ruleNames }),
    ...(originNames === undefined ? {} : { originNames }),
  };
}

export async function render(value: StatisticValue, inputs: Inputs = {}): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(BreakdownView);
  for (const [name, input] of Object.entries(inputsOf(value, inputs))) {
    fixture.componentRef.setInput(name, input);
  }
  await fixture.whenStable();
  const host: unknown = fixture.nativeElement;
  if (!(host instanceof HTMLElement)) {
    throw new Error('The breakdown rendered no host element');
  }
  return read(host);
}

/** What the rendered breakdown shows. */
function read(host: HTMLElement): Rendered {
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
