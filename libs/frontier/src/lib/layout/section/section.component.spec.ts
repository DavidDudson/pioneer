import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { Section } from './section.component';

interface Rendered {
  readonly region: HTMLElement;
  readonly heading: HTMLElement;
}

/** Renders `fr-section` with "Strength +4" projected and returns its region and heading. */
async function render(anchor: string, heading: string): Promise<Rendered> {
  const section = createComponent(Section, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createTextNode('Strength +4')]],
  });
  onTestFinished(() => {
    section.destroy();
  });
  section.setInput('anchor', anchor);
  section.setInput('heading', heading);
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(section.hostView);
  await appRef.whenStable();
  const host = section.location.nativeElement as HTMLElement;
  document.body.append(host);
  onTestFinished(() => {
    host.remove();
  });
  const region = host.querySelector<HTMLElement>('section');
  const title = host.querySelector<HTMLElement>('h2');
  if (region === null || title === null) {
    throw new Error('fr-section rendered no region or heading');
  }
  return { region, heading: title };
}

describe(Section, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('is a region labelled by its level 2 heading', async () => {
    const { region, heading } = await render('sheet-attributes', 'Attributes');
    expect(heading.textContent.trim()).toBe('Attributes');
    expect([heading.id, region.getAttribute('aria-labelledby')]).toStrictEqual([
      'sheet-attributes',
      'sheet-attributes',
    ]);
  });

  it('lets a skip link focus its heading', async () => {
    const { heading } = await render('sheet-identity', 'Identity');
    heading.focus();
    expect([heading.getAttribute('tabindex'), document.activeElement]).toStrictEqual(['-1', heading]);
  });

  it('projects its content after the heading', async () => {
    const { region } = await render('sheet-identity', 'Identity');
    expect(region.textContent.trim()).toBe('IdentityStrength +4');
  });
});
