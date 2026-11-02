import { TestBed } from '@angular/core/testing';
import { DefenceStatusKind, RuleId } from '@pioneer/rules/engine';
import type { Defences } from '@pioneer/rules/engine';
import { describe, expect, it } from 'vitest';

import {
  adjustment,
  BARBARIAN_DEFENCES,
  DWARF,
  ENTRY_NAMES,
  NO_DEFENCES,
  OUT_OF_RANGE,
} from '../../testing/defences-fixtures';
import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import { DefenceIcons } from './defence-icons.component';

async function render(defences: Defences | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(DefenceIcons);
  fixture.componentRef.setInput('defences', defences);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** The names of the icons shown, in order. */
function iconsOf(host: HTMLElement): readonly (string | null)[] {
  return [...host.querySelectorAll('button')].map((button) => button.getAttribute('aria-label'));
}

describe(DefenceIcons, () => {
  it('shows nothing while the defences load', async () => {
    const host = await render(undefined);
    expect(iconsOf(host)).toStrictEqual([]);
  });

  it('shows nothing for a character with none', async () => {
    const host = await render(NO_DEFENCES);
    expect(iconsOf(host)).toStrictEqual([]);
  });

  it('shows an icon for each kind the character has, resistances first', async () => {
    const host = await render(BARBARIAN_DEFENCES);
    expect(iconsOf(host)).toStrictEqual(['Resistances', 'Immunities', 'Weaknesses']);
  });

  it('shows only the kinds the character has', async () => {
    const host = await render({ ...NO_DEFENCES, weaknesses: BARBARIAN_DEFENCES.weaknesses });
    expect(iconsOf(host)).toStrictEqual(['Weaknesses']);
  });

  it('leaves out a kind whose lines are all superseded or failed', async () => {
    const host = await render({
      ...NO_DEFENCES,
      resistances: [
        adjustment(DWARF, 'cold', { value: 2, status: OUT_OF_RANGE }),
        adjustment(DWARF, 'fire', {
          value: 2,
          status: { kind: DefenceStatusKind.Superseded, by: RuleId.parse(`${DWARF}#0`) },
        }),
      ],
    });
    expect(iconsOf(host)).toStrictEqual([]);
  });
});
