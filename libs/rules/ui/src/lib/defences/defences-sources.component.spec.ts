import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { adjustment, ENTRY_NAMES, GOLEM_FORM, NO_DEFENCES } from '../testing/defences-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { DefencesView } from './defences.component';

/** The weakness and resistance lines as read, in page order. */
async function lines(kind: 'weaknesses' | 'resistances', type: 'area-damage' | 'splash-damage'): Promise<string[]> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(DefencesView);
  fixture.componentRef.setInput('defences', { ...NO_DEFENCES, [kind]: [adjustment(GOLEM_FORM, type, { value: 5 })] });
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  return [...host.querySelectorAll('[role="listitem"]')].map(
    (item) => item.querySelector('fr-text')?.textContent.trim() ?? '',
  );
}

describe('DefencesView sources', () => {
  it('names area damage for a weakness to it', async () => {
    await expect(lines('weaknesses', 'area-damage')).resolves.toStrictEqual(['Weakness 5 area damage']);
  });

  it('names splash damage for a resistance to it', async () => {
    await expect(lines('resistances', 'splash-damage')).resolves.toStrictEqual(['Resistance 5 splash damage']);
  });
});
