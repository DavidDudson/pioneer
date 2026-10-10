import { describe, expect, it } from 'vitest';

import { FieldHarness } from '../../../testing/field-harness';
import { FieldError } from './error.component';

describe(FieldError, () => {
  it("shows the problem as a message carrying the field's error id", async () => {
    const harness = new FieldHarness();
    harness.add(FieldError, 'Name is required.');
    await harness.stable();
    const message = harness.root.querySelector(`#${harness.field.instance.errorId}`);
    expect(message?.closest('fr-message')).not.toBeNull();
    expect(message?.textContent.trim()).toBe('Name is required.');
  });

  it('describes the field only while present', async () => {
    const harness = new FieldHarness();
    const error = harness.add(FieldError, 'Name is required.');
    await harness.stable();
    expect(harness.field.instance.describedBy()).toBe(harness.field.instance.errorId);
    error.destroy();
    expect(harness.field.instance.describedBy()).toBeUndefined();
  });
});
