import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ListItem } from '../list-item/list-item.component';
import { List } from './list.component';

async function render(inputs: Readonly<Record<string, unknown>>): Promise<Element> {
  const fixture = TestBed.createComponent(List);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  const list = (fixture.nativeElement as HTMLElement).firstElementChild;
  if (list === null) {
    throw new Error('List rendered no inner element');
  }
  return list;
}

describe(List, () => {
  it('renders an unmarked <ul> with a token gap by default', async () => {
    const list = await render({});
    expect(list.tagName).toBe('UL');
    expect(list.className).toContain('list-none');
    expect(list.className).toContain('gap-xs');
  });

  it('renders an <ol> when ordered, numbered when it shows markers', async () => {
    const list = await render({ ordered: true, markers: true, gap: 'md' });
    expect(list.tagName).toBe('OL');
    expect(list.className).toContain('list-decimal');
    expect(list.className).toContain('gap-md');
  });

  it('bullets an unordered list that shows markers', async () => {
    const list = await render({ markers: true });
    expect(list.className).toContain('list-disc');
  });
});

describe(ListItem, () => {
  it('is the list item itself, so the <ul> / <ol> holds only items and markers still show', async () => {
    const fixture = TestBed.createComponent(ListItem);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('role')).toBe('listitem');
    expect(host.className).toBe('list-item');
    expect(host.children).toHaveLength(0);
  });
});
