import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { element, part, renderProjected } from '../../testing/render-projected';
import { PageBody } from '../page-body/page-body.component';
import { Page } from './page.component';

const header = (): HTMLElement => element('fr-page-header', 'Header');
const body = (): HTMLElement => element('fr-page-body', 'Character list');
const aside = (): HTMLElement => element('fr-page-aside', 'Party notes');

describe(Page, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('puts the header above the body and the body beside the aside', async () => {
    const root = await renderProjected(Page, {}, [aside(), body(), header()]);
    const headerPart = part(root, 'fr-page-header');
    const bodyPart = part(root, 'fr-page-body');
    const asidePart = part(root, 'fr-page-aside');
    expect(headerPart.nextElementSibling?.contains(bodyPart)).toBe(true);
    expect(bodyPart.nextElementSibling).toBe(asidePart);
  });

  it('leaves the main landmark to fr-shell', async () => {
    const root = await renderProjected(Page, {}, [header(), body()]);
    expect(root.querySelector('main')).toBeNull();
  });

  it('sits in a page-width box with a gutter', async () => {
    const box = part(await renderProjected(Page, {}, [header(), body()]), 'fr-box');
    expect([...box.classList]).toContain('max-w-page');
    expect(box.querySelector(':scope > .p-lg.px-md')).not.toBeNull();
  });
});

describe(PageBody, () => {
  it('renders its content', async () => {
    const root = await renderProjected(PageBody, {}, [element('p', 'Character list')]);
    expect(root.textContent.trim()).toBe('Character list');
  });
});
