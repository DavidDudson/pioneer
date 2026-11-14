import { DeferBlockState, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RichText } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { provideEntryPreviews } from '../entry-preview/entry-preview';
import type { EntryPreviews } from '../entry-preview/entry-preview';
import { FIREBALL_PREVIEW } from '../entry-preview/entry-preview.fixtures';
import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { RichTextView } from './rich-text.component';

const MENTION = [
  { type: 'text', text: 'It has the incapacitation trait, and a fire spell with the manipulate or attack traits.' },
];

/** Every place rich text puts inline content: each must open the trait's card for a name before the word trait in it. */
const RENDERERS: Readonly<Record<string, unknown>> = {
  paragraph: { type: 'paragraph', content: MENTION },
  heading: { type: 'heading', level: 2, content: MENTION },
  'list item': { type: 'list', ordered: false, items: [[{ type: 'paragraph', content: MENTION }]] },
  'ordered list item': { type: 'list', ordered: true, items: [[{ type: 'paragraph', content: MENTION }]] },
  'table cell': { type: 'table', rows: [[MENTION]] },
  'table header': { type: 'table', header: [MENTION], rows: [[[{ type: 'text', text: 'x' }]]] },
};

/** A page that can show any trait. */
const PREVIEWS: EntryPreviews = { preview: () => FIREBALL_PREVIEW };

async function popovers(block: unknown, previews: EntryPreviews | undefined): Promise<number> {
  TestBed.configureTestingModule({
    providers: [
      provideRichTextTesting(),
      provideRouter([]),
      ...(previews === undefined ? [] : [provideEntryPreviews(previews)]),
    ],
  });
  const fixture = TestBed.createComponent(RichTextView);
  fixture.componentRef.setInput('text', RichText.parse([block]));
  await fixture.whenStable();
  const deferred = await fixture.getDeferBlocks();
  await Promise.all(deferred.map(async (each) => each.render(DeferBlockState.Complete)));
  return (fixture.nativeElement as HTMLElement).querySelectorAll('pio-content-preview').length;
}

describe('a trait named before the word trait in plain rich text', () => {
  it.each(Object.entries(RENDERERS))('opens its card from a %s', async (_name, block) => {
    await expect(popovers(block, PREVIEWS)).resolves.toBe(3);
  });

  it.each(Object.entries(RENDERERS))('stays plain in a %s where the page has no previews', async (_name, block) => {
    await expect(popovers(block, undefined)).resolves.toBe(0);
  });
});
