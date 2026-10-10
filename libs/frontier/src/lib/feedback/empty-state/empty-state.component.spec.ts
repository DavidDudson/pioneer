import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LucideDices } from '@lucide/angular';
import { describe, expect, it, onTestFinished } from 'vitest';

import { EmptyState } from './empty-state.component';

/** Renders an empty state with `action` projected (none by default) and returns its host element. */
async function render(inputs: Readonly<Record<string, unknown>>, action: readonly Node[] = []): Promise<HTMLElement> {
  const emptyState = createComponent(EmptyState, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[...action]],
  });
  onTestFinished(() => {
    emptyState.destroy();
  });
  emptyState.setInput('title', 'No rolls yet');
  for (const [name, value] of Object.entries(inputs)) {
    emptyState.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(emptyState.hostView);
  await appRef.whenStable();
  return emptyState.location.nativeElement as HTMLElement;
}

function paragraphs(host: HTMLElement): string[] {
  return [...host.querySelectorAll('p')].map((paragraph) => paragraph.textContent.trim());
}

/** The row the action is projected into. */
function actionRow(host: HTMLElement): HTMLDivElement | undefined {
  return [...host.querySelectorAll('div')].find((div) => div.classList.contains('empty:hidden'));
}

describe(EmptyState, () => {
  it('shows the title as text, not a heading', async () => {
    const host = await render({});
    expect(paragraphs(host)).toStrictEqual(['No rolls yet']);
    expect(host.querySelector('h1, h2, h3, h4')).toBeNull();
  });

  it('shows the description under the title when given', async () => {
    const host = await render({ description: 'Enter an expression and roll.' });
    expect(paragraphs(host)).toStrictEqual(['No rolls yet', 'Enter an expression and roll.']);
  });

  it('shows no icon unless given one, and then as decoration', async () => {
    const plain = await render({});
    expect(plain.querySelector('svg')).toBeNull();
    const withIcon = await render({ icon: LucideDices });
    expect(withIcon.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('projects the action into the action row', async () => {
    const action = document.createElement('span');
    action.textContent = 'Roll';
    const host = await render({}, [action]);
    expect(actionRow(host)?.textContent.trim()).toBe('Roll');
  });

  it('leaves the action row empty without an action, so it collapses', async () => {
    const host = await render({});
    expect(actionRow(host)?.childNodes).toHaveLength(0);
  });
});
