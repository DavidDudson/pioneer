import { describe, expect, it } from 'vitest';

import { FieldHarness } from '../../../testing/field-harness';
import { FieldHint } from './hint.component';

describe(FieldHint, () => {
  it("carries the field's hint id and shows the hint as a subtle caption", async () => {
    const harness = new FieldHarness();
    const hint = harness.add(FieldHint, 'As it appears on the sheet.');
    await harness.stable();
    const host = hint.location.nativeElement as HTMLElement;
    expect(host.id).toBe(harness.field.instance.hintId);
    expect(host.textContent.trim()).toBe('As it appears on the sheet.');
    const text = host.querySelector('fr-text');
    expect([text?.getAttribute('variant'), text?.getAttribute('tone')]).toStrictEqual(['caption', 'subtle']);
  });

  it('describes the field only while present', async () => {
    const harness = new FieldHarness();
    const hint = harness.add(FieldHint, 'As it appears on the sheet.');
    await harness.stable();
    expect(harness.field.instance.describedBy()).toBe(harness.field.instance.hintId);
    hint.destroy();
    expect(harness.field.instance.describedBy()).toBeUndefined();
  });
});
