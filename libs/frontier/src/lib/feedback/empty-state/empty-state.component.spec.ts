import { Dices } from 'lucide';
import { describe, expect, it } from 'vitest';

import { element, part, renderProjected } from '../../testing/render-projected';
import { EmptyStateDescription } from './empty-state-description.component';
import { EmptyStateHeader } from './empty-state-header.component';
import { EmptyStateMedia } from './empty-state-media.component';
import { EmptyStateTitle } from './empty-state-title.component';
import { EmptyState } from './empty-state.component';

/** The row the action is projected into. */
function actionRow(host: HTMLElement): HTMLDivElement | undefined {
  return [...host.querySelectorAll('div')].find((div) => div.classList.contains('empty:hidden'));
}

function words(host: HTMLElement): string {
  return host.textContent.replaceAll(/\s+/gu, ' ').trim();
}

describe(EmptyState, () => {
  it('lays media, then header or title, then the action, whatever order they are given in', async () => {
    const host = await renderProjected(EmptyState, {}, [
      element('button', 'Action'),
      element('fr-empty-state-title', 'Title'),
      element('fr-empty-state-media', 'Media'),
    ]);

    expect(words(host)).toBe('MediaTitleAction');
  });

  it('slots a header, a bare description and the action apart', async () => {
    const host = await renderProjected(EmptyState, {}, [
      element('button', 'Action'),
      element('fr-empty-state-header', 'Header'),
      element('fr-empty-state-description', 'Description'),
    ]);

    expect(words(host)).toBe('HeaderDescriptionAction');
    expect(actionRow(host)?.textContent.trim()).toBe('Action');
  });

  it('leaves the action row empty without an action, so it collapses', async () => {
    const host = await renderProjected(EmptyState, {}, [element('fr-empty-state-title', 'Title')]);
    expect(actionRow(host)?.childNodes).toHaveLength(0);
  });

  it('has no title attribute, so the browser shows no tooltip', async () => {
    const host = await renderProjected(EmptyState, {}, [element('fr-empty-state-title', 'Title')]);
    expect(host.hasAttribute('title')).toBe(false);
  });
});

describe(EmptyStateTitle, () => {
  it('shows its text as a paragraph, not a heading', async () => {
    const host = await renderProjected(EmptyStateTitle, {}, [element('span', 'No rolls yet')]);
    expect(part(host, 'p').textContent.trim()).toBe('No rolls yet');
    expect(host.querySelector('h1, h2, h3, h4')).toBeNull();
  });
});

describe(EmptyStateDescription, () => {
  it('shows its text as a paragraph', async () => {
    const host = await renderProjected(EmptyStateDescription, {}, [element('span', 'Enter an expression and roll.')]);
    expect(part(host, 'p').textContent.trim()).toBe('Enter an expression and roll.');
  });
});

describe(EmptyStateHeader, () => {
  it('groups what is projected', async () => {
    const host = await renderProjected(EmptyStateHeader, {}, [
      element('span', 'Title'),
      element('span', 'Description'),
    ]);

    expect(words(host)).toBe('TitleDescription');
  });
});

describe(EmptyStateMedia, () => {
  it('shows no icon unless given one, and then as decoration', async () => {
    const plain = await renderProjected(EmptyStateMedia, {}, []);
    expect(plain.querySelector('svg')).toBeNull();
    const withIcon = await renderProjected(EmptyStateMedia, { icon: Dices }, []);
    expect(withIcon.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
