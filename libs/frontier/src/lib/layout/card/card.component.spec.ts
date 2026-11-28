import { Component } from '@angular/core';
import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { CardContent } from './card-content.component';
import { CardFooter } from './card-footer.component';
import { Card } from './card.component';

@Component({
  selector: 'fr-card-full-host',
  imports: [Card, CardContent, CardFooter],
  templateUrl: './card-full-host.component.html',
})
class FullHost {
  protected readonly description = 'Visible to the GM';
}

@Component({
  selector: 'fr-card-bare-host',
  imports: [Card, CardContent],
  templateUrl: './card-bare-host.component.html',
})
class BareHost {}

@Component({
  selector: 'fr-card-loading-host',
  imports: [Card, CardContent],
  templateUrl: './card-loading-host.component.html',
})
class LoadingHost {}

@Component({
  selector: 'fr-card-alone-host',
  imports: [CardContent, CardFooter],
  templateUrl: './card-alone-host.component.html',
})
class AloneHost {}

async function render(type: Type<FullHost | BareHost | LoadingHost | AloneHost>): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(type);
  await fixture.whenStable();
  // SAFETY: the host of a rendered component is an HTMLElement in the DOM test environment; nativeElement is any.

  return fixture.nativeElement as HTMLElement;
}

function required(root: HTMLElement, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);

  if (found === null) {
    throw new Error(`fr-card rendered no ${selector}`);
  }

  return found;
}

/** The elements of `root`, in document order, by selector. */
function order(root: HTMLElement, selectors: ReadonlyArray<string>): ReadonlyArray<number> {
  const all = [...root.querySelectorAll('*')];

  return selectors.map((selector) => all.indexOf(required(root, selector)));
}

describe(Card, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('takes a heading and description, with actions beside them', async () => {
    const root = await render(FullHost);
    expect(required(root, 'h2').textContent.trim()).toBe('Notes');
    expect(required(root, 'p').textContent.trim()).toBe('Visible to the GM');
    expect(required(root, 'fr-card-header #actions').tagName).toBe('SPAN');
  });

  it('has no padding of its own and lends its token to every part', async () => {
    const root = await render(FullHost);

    const padded = ['fr-card', 'fr-card-header', '#first', '#footer'].map((selector) =>
      [...required(root, selector).classList].find((name) => name.startsWith('p-')),
    );

    expect(padded).toStrictEqual(['p-none', 'p-sm', 'p-sm', 'p-sm']);
  });

  it('sets the footer off with a rule above it, after the bodies', async () => {
    const root = await render(FullHost);

    const positions = order(root, ['#second', 'hr', '#footer']);

    expect(positions).toStrictEqual(positions.toSorted((first, second) => first - second));
  });

  it('shows a busy skeleton header while loading, without a heading', async () => {
    const root = await render(LoadingHost);
    expect(required(root, 'fr-card-header h2').getAttribute('aria-busy')).toBe('true');
  });

  it('pads parts used outside a card from the default token', async () => {
    const root = await render(AloneHost);

    const padded = ['#alone', '#alone-footer'].map((selector) =>
      [...required(root, selector).classList].find((name) => name.startsWith('p-')),
    );

    expect(padded).toStrictEqual(['p-lg', 'p-lg']);
  });

  it('draws no header and no rule without a heading or a footer', async () => {
    const root = await render(BareHost);
    expect([root.querySelector('fr-card-header') === null, root.querySelector('hr') === null]).toStrictEqual([
      true,
      true,
    ]);
    expect([...required(root, '#only').classList]).toContain('p-lg');
  });
});
