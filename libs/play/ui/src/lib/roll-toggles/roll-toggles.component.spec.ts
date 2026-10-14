import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { providePlayUiI18nTesting } from '../testing/provide-play-ui-testing';
import { RollToggles } from './roll-toggles.component';
import type { RollToggleChange, RollToggleView } from './roll-toggles.component';

const UNDEAD: RollToggleView = { id: 'bane', text: '+1 circumstance when the target is undead', on: false };
const FOCUS: RollToggleView = { id: 'focus', text: "Hunter's focus", on: true };

async function render(
  inputs: { readonly perRoll?: readonly RollToggleView[]; readonly remembered?: readonly RollToggleView[] } = {},
): Promise<ComponentFixture<RollToggles>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [providePlayUiI18nTesting()] });
  const fixture = TestBed.createComponent(RollToggles);
  fixture.componentRef.setInput('perRoll', inputs.perRoll ?? []);
  fixture.componentRef.setInput('remembered', inputs.remembered ?? []);
  await fixture.whenStable();
  return fixture;
}

function hostOf(fixture: ComponentFixture<RollToggles>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function buttonNamed(host: HTMLElement, text: string): HTMLButtonElement {
  const button = [...host.querySelectorAll('button')].find((candidate) => candidate.textContent.includes(text));
  if (button === undefined) {
    throw new Error(`Expected a button named ${text}`);
  }
  return button;
}

describe(RollToggles, () => {
  it('lists the toggles of each group under its own heading, pressed when on', async () => {
    const host = hostOf(await render({ perRoll: [UNDEAD], remembered: [FOCUS] }));

    expect(host.textContent).toContain('Counts for this roll only');
    expect(host.textContent).toContain('Kept between rolls');
    expect(buttonNamed(host, UNDEAD.text).getAttribute('aria-pressed')).toBe('false');
    expect(buttonNamed(host, FOCUS.text).getAttribute('aria-pressed')).toBe('true');
  });

  it('leaves out a group with nothing in it', async () => {
    const host = hostOf(await render({ perRoll: [UNDEAD] }));

    expect(host.textContent).toContain('Counts for this roll only');
    expect(host.textContent).not.toContain('Kept between rolls');
  });

  it('says which toggle was flipped in which group, and to what', async () => {
    const fixture = await render({ perRoll: [UNDEAD], remembered: [FOCUS] });
    const perRoll: RollToggleChange[] = [];
    const remembered: RollToggleChange[] = [];
    fixture.componentInstance.perRollChange.subscribe((change) => {
      perRoll.push(change);
    });
    fixture.componentInstance.rememberedChange.subscribe((change) => {
      remembered.push(change);
    });

    buttonNamed(hostOf(fixture), UNDEAD.text).click();
    buttonNamed(hostOf(fixture), FOCUS.text).click();

    expect(perRoll).toStrictEqual([{ id: 'bane', on: true }]);
    expect(remembered).toStrictEqual([{ id: 'focus', on: false }]);
  });
});
