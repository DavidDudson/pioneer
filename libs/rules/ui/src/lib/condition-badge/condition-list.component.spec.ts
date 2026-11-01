import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ConditionLine } from './condition-list.component';
import { ConditionList } from './condition-list.component';
import { ConditionSlug } from './condition-seriousness';

/** The list's text in order: the Bloodied line when it shows, then each condition's name and value. */
async function lines(conditions: readonly ConditionLine[], bloodied = false): Promise<readonly string[]> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(ConditionList);
  fixture.componentRef.setInput('conditions', conditions);
  fixture.componentRef.setInput('bloodied', bloodied);
  await fixture.whenStable();
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('fr-text')].map((text) => text.textContent.trim());
}

describe(ConditionList, () => {
  it('lists the most serious first, each with its value when it has one', async () => {
    const shown = await lines([
      { slug: ConditionSlug.Prone },
      { slug: ConditionSlug.Frightened, value: 2 },
      { slug: ConditionSlug.Dying, value: 1 },
    ]);
    expect(shown).toStrictEqual(['Dying', '1', 'Frightened', '2', 'Prone']);
  });

  it('says Bloodied above the conditions', async () => {
    const shown = await lines([{ slug: ConditionSlug.Wounded, value: 1 }], true);
    expect(shown).toStrictEqual(['Bloodied', 'Wounded', '1']);
  });

  it('says Bloodied alone for a hurt character with no conditions', async () => {
    await expect(lines([], true)).resolves.toStrictEqual(['Bloodied']);
  });

  it('says there are no conditions when there is nothing to list', async () => {
    await expect(lines([])).resolves.toStrictEqual(['No conditions']);
  });

  it('names a condition it does not know generically', async () => {
    await expect(lines([{ slug: 'homebrew-curse', value: 3 }])).resolves.toStrictEqual(['Condition', '3']);
  });
});
