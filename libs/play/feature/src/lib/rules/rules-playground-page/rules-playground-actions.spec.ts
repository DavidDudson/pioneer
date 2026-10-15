import { describe, expect, it } from 'vitest';

import { chooseSchema, openPlayground, pageText, secondTextArea, typeInto } from './playground-harness';

describe('RulesPlaygroundPage available actions', () => {
  it('opens on the example list with each action’s status and why it cannot be used', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Available actions');

    const text = pageText(harness);
    expect(text).toContain('Stride');
    expect(text).toContain('Pick a Lock');
    expect(text).toContain('Needs trained proficiency in thievery.');
    expect(text).toContain('Its requirements are not met.');
  });

  it('labels the status, cost and mode of each action', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Available actions');

    const text = pageText(harness);
    expect(text).toContain('Available');
    expect(text).toContain('Unavailable');
    expect(text).toContain('2 actions');
    expect(text).toContain('Reaction');
    expect(text).toContain('Downtime');
  });

  it('makes an action usable when a roll option it needs is added', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Available actions');
    await typeInto(harness, secondTextArea(harness), 'self:effect:raised-shield');

    expect(pageText(harness)).not.toContain('Its requirements are not met.');
  });
});
