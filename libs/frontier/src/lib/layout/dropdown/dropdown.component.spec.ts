import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { LucideMenu } from '@lucide/angular';
import { describe, expect, it } from 'vitest';

import { Link } from '../../actions/link/link.component';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { Dropdown } from './dropdown.component';
import type { DropdownAlign } from './dropdown.component';

// A host is the only way to project the panel into the dropdown.
@Component({
  selector: 'fr-dropdown-host',
  imports: [Dropdown, Link],
  // oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `
    <fr-dropdown label="Sections" [icon]="icon">
      <fr-link href="#characters">Characters</fr-link>
      <button type="button" id="inside">Keep open</button>
    </fr-dropdown>
    <button type="button" id="outside">Elsewhere</button>
  `,
})
class Host {
  protected readonly icon = LucideMenu;
}

@Component({
  selector: 'fr-dropdown-caption-host',
  imports: [Dropdown],
  // oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `<fr-dropdown label="Theme" caption="Dynamic">Options</fr-dropdown>`,
})
class CaptionHost {}

async function render(): Promise<ComponentFixture<Host>> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  return fixture;
}

function trigger(fixture: ComponentFixture<unknown>): HTMLButtonElement {
  const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[aria-label]');
  if (button === null) {
    throw new Error('No trigger');
  }
  return button;
}

function panel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="group"][aria-label]');
}

@Component({
  selector: 'fr-dropdown-end-host',
  imports: [Dropdown],
  // oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `<div style="display: flex; justify-content: flex-end; width: 600px">
    <fr-dropdown label="Menu" caption="Menu" [align]="align()">Options and a wide enough panel to overhang</fr-dropdown>
  </div>`,
})
class AlignHost {
  public readonly align = input<DropdownAlign>('start');
}

describe(Dropdown, () => {
  it.each([
    ['start', 'left'],
    ['end', 'right'],
  ] as const)("lines the panel up with the trigger's %s edge", async (align, edge) => {
    const fixture = TestBed.createComponent(AlignHost);
    fixture.componentRef.setInput('align', align);
    await fixture.whenStable();
    const button = trigger(fixture);
    button.click();
    await fixture.whenStable();
    expect(panel()?.getBoundingClientRect()[edge]).toBeCloseTo(button.getBoundingClientRect()[edge], 0);
  });

  it('is closed until the trigger is pressed, and says so to assistive tech', async () => {
    const fixture = await render();
    expect(panel()).toBeNull();
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(trigger(fixture).getAttribute('aria-haspopup')).toBe('true');
  });

  it('opens a labelled panel with its content when the trigger is pressed', async () => {
    const fixture = await render();

    trigger(fixture).click();
    await fixture.whenStable();
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(panel()?.getAttribute('aria-label')).toBe('Sections');
    expect(panel()?.textContent).toContain('Characters');
  });

  it('is an icon-only button named by its label', async () => {
    const fixture = await render();
    expect(trigger(fixture).getAttribute('aria-label')).toBe('Sections');
    expect(trigger(fixture).textContent.trim()).toBe('');
    expect(trigger(fixture).querySelector('svg')).not.toBeNull();
  });

  it('shows a caption and a caret when it has a caption', async () => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
    const fixture = TestBed.createComponent(CaptionHost);
    await fixture.whenStable();
    expect(trigger(fixture).textContent.trim()).toBe('Dynamic');
    expect(trigger(fixture).querySelector('svg')).not.toBeNull();
  });

  it('closes on Escape', async () => {
    const fixture = await render();
    trigger(fixture).click();
    await fixture.whenStable();
    panel()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });

  it('closes when a link inside it is followed, and stays open for other controls', async () => {
    const fixture = await render();
    trigger(fixture).click();
    await fixture.whenStable();
    document.querySelector<HTMLElement>('#inside')?.click();
    await fixture.whenStable();
    expect(panel()).not.toBeNull();

    document.querySelector<HTMLElement>('[role="group"] a')?.click();
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });

  it('closes on a press outside it', async () => {
    const fixture = await render();
    trigger(fixture).click();
    await fixture.whenStable();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });
});
