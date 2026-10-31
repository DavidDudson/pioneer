import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideContentUiI18nTesting } from '../testing/provide-content-ui-testing';
import { LegacyBadge } from './legacy-badge.component';

async function render(legacy: boolean): Promise<ComponentFixture<LegacyBadge>> {
  TestBed.configureTestingModule({ providers: provideContentUiI18nTesting() });
  const fixture = TestBed.createComponent(LegacyBadge);
  fixture.componentRef.setInput('legacy', legacy);
  await fixture.whenStable();
  return fixture;
}

const text = (fixture: ComponentFixture<LegacyBadge>): string => (fixture.nativeElement as HTMLElement).textContent;

describe(LegacyBadge, () => {
  it('says Legacy for a legacy entry', async () => {
    expect(text(await render(true))).toContain('Legacy');
  });

  it('shows nothing for any other entry', async () => {
    expect(text(await render(false)).trim()).toBe('');
  });
});
