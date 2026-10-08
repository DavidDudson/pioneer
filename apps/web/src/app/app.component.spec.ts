import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import { App } from './app.component';
import { appMessages } from './messages';

describe(App, () => {
  it('renders the shell with the Community Use notice', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideI18n(appMessages)],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Pioneer');
    expect(element.textContent).toContain("Paizo's Community Use Policy");
  });

  it('links the public Legal page from the footer', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideI18n(appMessages)],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const legal = element.querySelector('footer a[href="/legal"]');
    expect(legal?.textContent.trim()).toBe('Legal');
  });
});
