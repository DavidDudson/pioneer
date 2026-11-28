import { ApplicationRef, Component, createComponent, EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';

import { AsyncSectionHost } from '../../testing/async-section-host';
import type { ComponentInputs } from '../../testing/component-inputs';
import { FakeQuery } from '../../testing/fake-query';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { Inset } from '../../tokens';
import { DEFAULT_SURFACE_PADDING } from '../surface/surface.component';
import { SectionBody } from './section-body.directive';
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
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
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

  it('is built on a card', async () => {
    const { region } = await render('sheet-identity', 'Identity');

    expect(region.querySelector('fr-card fr-card-header h2')).not.toBeNull();
  });

  it('pads like a bare surface', async () => {
    const { region } = await render('sheet-identity', 'Identity');

    const parts = ['fr-card-header', 'fr-card-content'].map(
      (part) => region.querySelector<HTMLElement>(part)?.className,
    );

    expect(parts.map((name) => name?.includes(`p-${DEFAULT_SURFACE_PADDING}`))).toStrictEqual([true, true]);

    expect(DEFAULT_SURFACE_PADDING).toBe(Inset.Panel);
  });

  it('projects its content after the heading', async () => {
    const { region } = await render('sheet-identity', 'Identity');
    expect(region.textContent.trim()).toBe('IdentityStrength +4');
  });
});

@Component({
  selector: 'fr-section-body-host',
  imports: [Section, SectionBody],
  templateUrl: './section-body-host.component.html',
})
class SectionBodyHost {
  public readonly shown = signal('first');
}

describe('Section body', () => {
  let fixture: ComponentFixture<SectionBodyHost>;
  let root: HTMLElement;

  const show = async (which: string): Promise<void> => {
    fixture.componentInstance.shown.set(which);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
    fixture = TestBed.createComponent(SectionBodyHost);
    // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
    root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('builds only the shown section', () => {
    expect(root.querySelector('#first-body')).not.toBeNull();
    expect(root.querySelector('#second-body')).toBeNull();
  });

  it('builds a section the first time it is shown', async () => {
    await show('second');
    expect(root.querySelector('#second-body')).not.toBeNull();
  });

  it('keeps a built section, concealed, when another is shown', async () => {
    await show('second');
    const first = root.querySelector('#first-body');
    expect(first).not.toBeNull();
    expect(first?.closest('fr-section')?.classList.contains('hidden')).toBe(true);
    await show('first');
    expect(root.querySelector('#first-body')).toBe(first);
  });
});

describe('Async section', () => {
  let fixture: ComponentFixture<AsyncSectionHost>;
  let query: FakeQuery<ReadonlyArray<string>>;
  let section: HTMLElement;

  const settle = async (): Promise<void> => {
    await fixture.whenStable();
  };

  const mount = async (inputs: ComponentInputs<AsyncSectionHost> = {}): Promise<void> => {
    fixture = TestBed.createComponent(AsyncSectionHost);
    query = new FakeQuery<ReadonlyArray<string>>();
    fixture.componentRef.setInput('query', query);

    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }

    await settle();
    // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
    const found = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('fr-section');

    if (found === null) {
      throw new Error('Expected an fr-section');
    }

    section = found;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('shows skeleton lines, and is busy, while the query loads', async () => {
    await mount();
    expect(section.querySelectorAll('fr-skeleton')).toHaveLength(3);
    expect(section.getAttribute('aria-busy')).toBe('true');
  });

  it('shows the data once loaded', async () => {
    await mount();
    query.succeed(['Valeros', 'Seoni']);
    await settle();
    expect([...section.querySelectorAll('fr-text')].map((text) => text.textContent.trim())).toStrictEqual([
      'Valeros',
      'Seoni',
    ]);
    expect(section.hasAttribute('aria-busy')).toBe(false);
  });

  it('shows the failure inline in place of the data', async () => {
    await mount();
    query.fail(new Error('500'));
    await settle();
    expect(section.querySelector('fr-alert')).not.toBeNull();
  });

  it('shows the default empty state, or the empty slot', async () => {
    await mount();
    query.succeed([]);
    await settle();
    expect(section.querySelector('fr-empty-state')?.textContent.trim()).toBe('Nothing here yet.');
    await mount({ customEmpty: true });
    query.succeed([]);
    await settle();
    expect(section.querySelector('fr-empty-state')).toBeNull();
    expect(section.textContent).toContain('Nobody yet');
  });

  it('shows no matches with a Clear button that emits cleared when filtered', async () => {
    await mount({ filtered: true });
    query.succeed([]);
    await settle();
    expect(section.querySelector('fr-empty-state-title')?.textContent.trim()).toBe('Nothing matches.');
    section.querySelector<HTMLElement>('fr-button button')?.click();
    await settle();
    expect(fixture.componentInstance.clearCount()).toBe(1);
  });
});
