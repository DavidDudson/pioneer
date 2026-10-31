import { TestBed } from '@angular/core/testing';
import { ContentText, DamageType, RichText } from '@pioneer/rules/sdk';
import type { Selector } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { INLINE_ROLLER } from './inline-roller';
import type { InlineRoller } from './inline-roller';
import { provideRichTextLinks } from './rich-text-links';
import { RichTextView } from './rich-text.component';

const KNOWN: ReadonlySet<string> = new Set(['save:reflex', 'save:will']);
const NAMES: ReadonlyMap<string, ContentText> = new Map([
  ['save:reflex', ContentText.parse('Reflex')],
  ['save:will', ContentText.parse('Will')],
  ['skill:athletics', ContentText.parse('Athletics')],
]);

interface Rendered {
  readonly element: HTMLElement;
  readonly roller: InlineRoller;
}

/** Renders one paragraph of `content` for a reader with Reflex and Will, or with no roller at all. */
async function render(content: readonly unknown[], withRoller = true): Promise<Rendered> {
  const roller: InlineRoller = {
    hasStatistic: (selector: Selector): boolean => KNOWN.has(selector),
    check: vi.fn<InlineRoller['check']>(),
    damage: vi.fn<InlineRoller['damage']>(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRichTextTesting(),
      provideRichTextLinks({
        name: (): undefined => undefined,
        target: (): undefined => undefined,
        statisticName: (selector): ContentText | undefined => NAMES.get(selector),
      }),
      ...(withRoller ? [{ provide: INLINE_ROLLER, useValue: roller }] : []),
    ],
  });
  const fixture = TestBed.createComponent(RichTextView);
  fixture.componentRef.setInput('text', RichText.parse([{ type: 'paragraph', content }]));
  await fixture.whenStable();
  return { element: fixture.nativeElement as HTMLElement, roller };
}

function buttons(element: HTMLElement): readonly HTMLButtonElement[] {
  return [...element.querySelectorAll('button')];
}

describe('rolling a check or damage in text', () => {
  it('rolls a check the reader has the statistic for, naming it for a screen reader', async () => {
    const { element, roller } = await render([{ type: 'check', statistic: 'save:reflex', dc: 20 }]);
    const [button] = buttons(element);
    expect(button?.textContent.trim()).toBe('DC 20 Reflex save');
    expect(button?.getAttribute('aria-label')).toBe('Roll DC 20 Reflex save');
    button?.click();
    expect(roller.check).toHaveBeenCalledWith({
      node: { type: 'check', statistic: 'save:reflex', dc: 20 },
      label: 'DC 20 Reflex save',
    });
  });

  it('rolls a basic save as the same check, marked basic', async () => {
    const { element, roller } = await render([{ type: 'check', statistic: 'save:will', basic: true, dc: 17 }]);
    buttons(element)[0]?.click();
    expect(roller.check).toHaveBeenCalledWith({
      node: { type: 'check', statistic: 'save:will', basic: true, dc: 17 },
      label: 'DC 17 basic Will save',
    });
  });

  it('rolls damage', async () => {
    const { element, roller } = await render([
      { type: 'damage', instances: [{ formula: '2d6', damageType: DamageType.Fire }] },
    ]);
    const [button] = buttons(element);
    expect(button?.textContent.trim()).toBe('2d6 fire');
    button?.click();
    expect(roller.damage).toHaveBeenCalledTimes(1);
  });

  it('shows a check as text with the reason when the reader has no statistic for it', async () => {
    const { element } = await render([{ type: 'check', statistic: 'skill:athletics', dc: 20 }]);
    expect(buttons(element)).toHaveLength(0);
    expect(element.textContent.replaceAll(/\s+/gu, ' ')).toContain('DC 20 Athletics (no Athletics on this character)');
  });

  it('keeps checks and damage as plain text where nothing rolls them', async () => {
    const { element } = await render(
      [
        { type: 'check', statistic: 'save:reflex', dc: 20 },
        { type: 'damage', instances: [{ formula: '2d6', damageType: DamageType.Fire }] },
      ],
      false,
    );
    expect(buttons(element)).toHaveLength(0);
    expect(element.textContent).not.toContain('on this character');
  });
});
