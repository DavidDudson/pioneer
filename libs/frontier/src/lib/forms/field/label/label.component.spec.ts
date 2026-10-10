import { describe, expect, it } from 'vitest';

import { FieldHarness } from '../../../testing/field-harness';
import { Label } from './label.component';

async function render(inputs: Readonly<Record<string, unknown>> = {}): Promise<FieldHarness> {
  const harness = new FieldHarness();
  harness.add(Label, 'Name', inputs);
  await harness.stable();
  return harness;
}

function label(harness: FieldHarness): HTMLLabelElement {
  const found = harness.root.querySelector('label');
  if (found === null) {
    throw new Error('Expected a label');
  }
  return found;
}

describe(Label, () => {
  it("is the field's label element, with its id, pointing at the field's control", async () => {
    const harness = await render();
    expect(label(harness).id).toBe(harness.field.instance.labelId);
    expect(label(harness).htmlFor).toBe(harness.field.instance.controlId);
    expect(label(harness).textContent.trim()).toBe('Name');
  });

  it('is visible by default and kept for screen readers only when visuallyHidden', async () => {
    const visible = await render();
    expect(label(visible).classList).not.toContain('sr-only');
    const hidden = await render({ visuallyHidden: true });
    expect(label(hidden).classList).toContain('sr-only');
  });
});
