import { TestBed } from '@angular/core/testing';
import type { Origin } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { DIRECT, ENTRY_NAMES, EVERY_HOP, ORIGIN_NAMES, PLAIN_CONDITION, SET_BY_HAND } from '../testing/origin-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { OriginChainView } from './origin-chain.component';
import { NO_ORIGIN_NAMES } from './origin-names';
import type { OriginNames } from './origin-names';

/** The chain as read: its sentence, then its sources. */
interface Rendered {
  readonly chain: string;
  readonly sources: string;
}

function textOf(element: Element | null): string {
  return (element?.textContent ?? '').replaceAll(/\s+/gu, ' ').trim();
}

async function render(origin: Origin, entryNames = ENTRY_NAMES, names: OriginNames = ORIGIN_NAMES): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(OriginChainView);
  fixture.componentRef.setInput('origin', origin);
  fixture.componentRef.setInput('entryNames', entryNames);
  fixture.componentRef.setInput('names', names);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  return { chain: textOf(host.querySelector('fr-text')), sources: textOf(host.querySelector('pio-source-line')) };
}

describe(OriginChainView, () => {
  it('names the entry holding the rule element, then its sources', async () => {
    await expect(render(DIRECT)).resolves.toStrictEqual({ chain: 'Shield Block', sources: 'Player Core p. 266' });
  });

  it('words every hop, outermost first, and ends at the entry', async () => {
    const { chain } = await render(EVERY_HOP);

    expect(chain).toBe(
      [
        'chosen for Class',
        'granted by Fighter',
        'Steel Shield, held',
        'Frightened 2, applied by Demoralize',
        'Raise a Shield, applied by Demoralize',
        'Proficiency Without Level',
        'Shield Block',
      ].join(' → '),
    );
  });

  it('says who set an override, how long ago, and why', async () => {
    const { chain } = await render(SET_BY_HAND);

    expect(chain).toBe('set by Ada 2 days ago, “House rule” → Shield Block');
  });

  it('reads a condition without a value or a known event as its name', async () => {
    const { chain } = await render(PLAIN_CONDITION);

    expect(chain).toBe('Frightened → Shield Block');
  });

  it('falls back when names are missing: the slot key, an item, no event, the entry id', async () => {
    const { chain } = await render(EVERY_HOP, new Map(), NO_ORIGIN_NAMES);

    const [slot, , item] = chain.split(' → ');
    expect(slot).toBe('chosen for class');
    expect(item).toBe('an item, held');
    expect(chain).not.toContain('applied by');
    expect(chain.endsWith(EVERY_HOP.entry)).toBe(true);
  });

  it('calls a user it cannot name a user, never by id', async () => {
    const { chain } = await render(SET_BY_HAND, ENTRY_NAMES, NO_ORIGIN_NAMES);

    expect(chain).toBe('set by a user 2 days ago, “House rule” → Shield Block');
  });
});
