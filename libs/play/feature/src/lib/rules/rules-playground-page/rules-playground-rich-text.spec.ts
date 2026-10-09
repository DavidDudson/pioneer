import { describe, expect, it } from 'vitest';

import { chooseSchema, openPlayground, pageText, typeJson } from './playground-harness';

describe('RulesPlaygroundPage rich text', () => {
  it('previews the example with text from the rules bundle', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Rich text');
    const text = pageText(harness);

    expect(text).toContain('Valid.');
    expect(text).toContain('Preview');
    expect(text).toContain('20-foot burst');
    expect(text).toContain('6d6 fire');
    expect(text).toContain('DC 18 basic save:reflex');
    expect(text).toContain('1 round');
    expect(harness.routeNativeElement?.querySelector('abbr')?.getAttribute('title')).toBe('Two actions');
  });

  it('drops the preview and lists the problems when the text does not validate', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Rich text');
    await typeJson(harness, '[{ "type": "paragraph", "content": [{ "type": "html", "html": "<b>hi</b>" }] }]');
    const text = pageText(harness);

    expect(text).toContain('1 problem');
    expect(text).not.toContain('Preview');
    expect(harness.routeNativeElement?.querySelector('b')).toBeNull();
  });
});
