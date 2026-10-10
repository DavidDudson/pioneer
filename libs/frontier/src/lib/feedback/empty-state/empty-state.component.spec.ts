import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { LucideIcon } from '@lucide/angular';
import { LucideDices } from '@lucide/angular';
import { describe, expect, it } from 'vitest';

import { Button } from '../../actions/button/button.component';
import { EmptyState } from './empty-state.component';

@Component({
  imports: [EmptyState, Button],
  template: `
    <fr-empty-state [icon]="icon()" [title]="'No rolls yet'" [description]="description()">
      @if (withAction()) {
        <fr-button>Roll</fr-button>
      }
    </fr-empty-state>
  `,
})
class Host {
  public readonly icon = input<LucideIcon | undefined>(undefined);
  public readonly description = input<string | undefined>(undefined);
  public readonly withAction = input(false);
}

interface Options {
  readonly icon?: LucideIcon;
  readonly description?: string;
  readonly withAction?: boolean;
}

function render(options: Options = {}): HTMLElement {
  const fixture: ComponentFixture<Host> = TestBed.createComponent(Host);
  fixture.componentRef.setInput('icon', options.icon);
  fixture.componentRef.setInput('description', options.description);
  fixture.componentRef.setInput('withAction', options.withAction ?? false);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function paragraphs(host: HTMLElement): string[] {
  return [...host.querySelectorAll('p')].map((paragraph) => paragraph.textContent.trim());
}

describe(EmptyState, () => {
  it('shows the title as text, not a heading', () => {
    const host = render();
    expect(paragraphs(host)).toStrictEqual(['No rolls yet']);
    expect(host.querySelector('h1, h2, h3, h4')).toBeNull();
  });

  it('shows the description under the title when given', () => {
    const host = render({ description: 'Enter an expression and roll.' });
    expect(paragraphs(host)).toStrictEqual(['No rolls yet', 'Enter an expression and roll.']);
  });

  it('shows the icon as decoration when given', () => {
    expect(render().querySelector('svg')).toBeNull();
    const icon = render({ icon: LucideDices }).querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('projects the action', () => {
    const host = render({ withAction: true });
    expect(host.querySelector('button')?.textContent.trim()).toBe('Roll');
  });

  it('leaves the action row empty when there is no action, so it collapses', () => {
    const host = render();
    const actions = [...host.querySelectorAll('div')].find((div) => div.className.includes('empty:hidden'));
    expect(actions).toBeDefined();
    expect(actions?.children).toHaveLength(0);
    expect(host.querySelector('button')).toBeNull();
  });
});
