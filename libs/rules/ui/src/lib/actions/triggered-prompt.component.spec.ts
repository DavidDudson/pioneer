import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ActionStatus } from '@pioneer/rules/engine';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import { SHIELD_RAISED_ACTIONS } from '../testing/action-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ActionLine } from './action-line';
import { ActionUser } from './action-user';
import type { ActionUse } from './action-user';
import { TriggeredPrompt } from './triggered-prompt.component';

function lineNamed(name: string): ActionLine {
  const found = SHIELD_RAISED_ACTIONS.find((line) => line.name === name);

  if (found === undefined) {
    throw new Error(`no ${name} in the fixtures`);
  }

  return found;
}

const STRIDE = lineNamed('Stride');
const SHIELD_BLOCK = lineNamed('Shield Block');

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

async function render(
  lines: readonly ActionLine[],
  use: (request: ActionUse) => Promise<void> = async () => {},
): Promise<ComponentFixture<TriggeredPrompt>> {
  TestBed.configureTestingModule({
    providers: [
      provideRulesUiI18nTesting(),
      provideTanStackQuery(new QueryClient()),
      { provide: ActionUser, useValue: { use } },
    ],
  });
  const fixture = TestBed.createComponent(TriggeredPrompt);
  fixture.componentRef.setInput('lines', lines);
  await fixture.whenStable();

  return fixture;
}

function hostOf(fixture: ComponentFixture<TriggeredPrompt>): HTMLElement {
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return fixture.nativeElement as HTMLElement;
}

function press(fixture: ComponentFixture<TriggeredPrompt>, label: string): void {
  const button = [...hostOf(fixture).querySelectorAll('button')].find((candidate) => textOf(candidate) === label);
  button?.click();
}

describe(TriggeredPrompt, () => {
  it('offers one ability with a use button and a way to let it pass', async () => {
    const fixture = await render([STRIDE]);
    const text = textOf(hostOf(fixture));

    expect(text).toContain('Triggered abilities');
    expect(text).toContain('Stride');
    expect(text).toContain('Use');
    expect(text).toContain('Let them pass');
  });

  it('lists several abilities in one prompt', async () => {
    const fixture = await render([STRIDE, SHIELD_BLOCK]);
    const prompt = hostOf(fixture);

    expect(prompt.querySelectorAll('pio-action-row')).toHaveLength(2);
    expect(prompt.querySelectorAll('fr-heading')).toHaveLength(1);
  });

  it('shows a spent reaction with no way to use it', async () => {
    const spent: ActionLine = { ...SHIELD_BLOCK, status: ActionStatus.Unavailable, affordable: false };
    const fixture = await render([spent]);

    expect(textOf(hostOf(fixture))).toContain('Shield Block');
    expect([...hostOf(fixture).querySelectorAll('button')].map((button) => textOf(button))).not.toContain('Use');
  });

  it('uses an offered ability as any action is used', async () => {
    const use = vi.fn<(request: ActionUse) => Promise<void>>(async () => {});
    const fixture = await render([STRIDE], use);
    press(fixture, 'Use');
    await fixture.whenStable();

    expect(use).toHaveBeenCalledTimes(1);
    expect(use.mock.calls[0]?.[0].line.id).toBe(STRIDE.id);
  });

  it('says so when the player lets them pass', async () => {
    const fixture = await render([STRIDE]);
    let passed = false;
    fixture.componentInstance.passed.subscribe(() => {
      passed = true;
    });
    press(fixture, 'Let them pass');

    expect(passed).toBe(true);
  });

  it('shows nothing when no ability is offered', async () => {
    const fixture = await render([]);

    expect(textOf(hostOf(fixture))).toBe('');
  });
});
