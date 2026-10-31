import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { GiftBadge } from './gift-badge.component';

async function render(count: number): Promise<ComponentFixture<GiftBadge>> {
  TestBed.configureTestingModule({ providers: [provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(GiftBadge);
  fixture.componentRef.setInput('count', count);
  fixture.componentRef.setInput('label', 'Gifts waiting');
  await fixture.whenStable();
  return fixture;
}

function host(fixture: ComponentFixture<GiftBadge>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe(GiftBadge, () => {
  it('is a button named by its label, with a rocking present', async () => {
    const fixture = await render(1);
    expect(host(fixture).querySelector('button')?.getAttribute('aria-label')).toBe('Gifts waiting');
    expect(host(fixture).querySelector('.animate-wiggle')).not.toBeNull();
  });

  it('shows no count for one gift and the count for several', async () => {
    expect(host(await render(1)).textContent.trim()).toBe('');
    TestBed.resetTestingModule();
    expect(host(await render(3)).textContent.trim()).toBe('3');
  });

  it('reports a press', async () => {
    const fixture = await render(2);
    let opened = 0;
    fixture.componentInstance.opened.subscribe(() => {
      opened += 1;
    });
    host(fixture).querySelector('button')?.click();
    expect(opened).toBe(1);
  });
});
