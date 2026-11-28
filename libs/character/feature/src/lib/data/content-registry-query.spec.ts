import { TestBed } from '@angular/core/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContentPriority, injectContentRegistry } from './content-registry-query';
import { SheetContentGate } from './sheet-content-gate';

const registry = vi.fn<ContentLoader['registry']>();
const warm = vi.fn<ContentLoader['warm']>();

/** Runs `injectContentRegistry` in an injection context, with the sheet's gate when `gated`. */
function load(gated: boolean, priority: ContentPriority, enabled: () => boolean = () => true): SheetContentGate {
  const gate = new SheetContentGate();

  TestBed.configureTestingModule({
    providers: [
      provideTanStackQuery(new QueryClient()),
      { provide: ContentLoader, useValue: { registry, warm } },
      ...(gated ? [{ provide: SheetContentGate, useValue: gate }] : []),
    ],
  });
  TestBed.runInInjectionContext(() => injectContentRegistry([ContentKind.Spell], enabled, priority));
  TestBed.tick();

  return gate;
}

describe(injectContentRegistry, () => {
  beforeEach(() => {
    registry.mockReset().mockResolvedValue(new ContentRegistry());
    warm.mockReset().mockResolvedValue();
  });

  it('holds a section back until the sheet releases its gate', async () => {
    const gate = load(true, ContentPriority.Section);

    expect(registry).not.toHaveBeenCalled();
    expect(warm).not.toHaveBeenCalled();

    gate.release();
    TestBed.tick();

    await vi.waitFor(() => {
      expect(registry).toHaveBeenCalledTimes(1);
    });
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('loads the registry the engine reads at once', async () => {
    load(true, ContentPriority.Engine);

    await vi.waitFor(() => {
      expect(registry).toHaveBeenCalledTimes(1);
    });
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('loads nothing while the registry is not enabled, whatever the gate and priority', () => {
    const gate = load(true, ContentPriority.Engine, () => false);
    gate.release();
    TestBed.tick();

    expect(registry).not.toHaveBeenCalled();
    expect(warm).not.toHaveBeenCalled();
  });

  it('stays released once released', () => {
    const gate = new SheetContentGate();

    expect(gate.released()).toBe(false);

    gate.release();

    expect(gate.released()).toBe(true);
  });

  it('loads a section at once off the sheet, where there is no gate', async () => {
    load(false, ContentPriority.Section);

    await vi.waitFor(() => {
      expect(registry).toHaveBeenCalledTimes(1);
    });
  });
});
