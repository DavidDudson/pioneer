import type { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';

import { STATISTIC_DEFINITIONS } from '../statistic-sources';
import type { LoadStatisticDefinitions } from '../statistic-sources';
import { chooseSchema, openPlayground, pageText, present, pressIn, textAreas } from './playground-harness';

/** Lets the scripted loader's settled promise run its continuation, then renders. */
async function settle(harness: RouterTestingHarness): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  await harness.fixture.whenStable();
}

const PACK_DEFINITIONS =
  '[{ "slug": "will", "name": "Will", "selector": "save:will", "domains": [], "base": "@attr.wis", "kind": "check" }]';

/** A loader whose loads stay pending until the spec settles them, oldest first. */
class ScriptedLoader {
  readonly #pending: { readonly resolve: (json: string) => void; readonly reject: (error: Error) => void }[] = [];

  public readonly load: LoadStatisticDefinitions = async () =>
    new Promise<string>((resolve, reject) => {
      this.#pending.push({ resolve, reject });
    });

  public resolve(json: string): void {
    present(this.#pending.shift()).resolve(json);
  }

  public reject(): void {
    present(this.#pending.shift()).reject(new Error('chunk failed to load'));
  }
}

async function openWith(loader: ScriptedLoader): Promise<RouterTestingHarness> {
  const harness = await openPlayground([{ provide: STATISTIC_DEFINITIONS, useValue: loader.load }]);
  await chooseSchema(harness, 'Statistics');
  return harness;
}

describe('RulesPlaygroundPage statistic sources', () => {
  it('shows a skeleton in place of the fields while a pack loads, then its definitions', async () => {
    const loader = new ScriptedLoader();
    const harness = await openWith(loader);
    await pressIn(harness, 'Statistics from', 'Core rules pack');

    const page = present(harness.routeNativeElement);
    expect(page.querySelector('fr-skeleton')).not.toBeNull();
    expect(page.querySelector('pio-statistics-fields')).toBeNull();

    loader.resolve(PACK_DEFINITIONS);
    await settle(harness);
    expect(page.querySelector('fr-skeleton')).toBeNull();
    expect(present(textAreas(harness)[0]).value).toBe(PACK_DEFINITIONS);
  });

  it('keeps the example and says so when the pack fails, and loads it when picked again', async () => {
    const loader = new ScriptedLoader();
    const harness = await openWith(loader);
    const example = present(textAreas(harness)[0]).value;
    await pressIn(harness, 'Statistics from', 'Core rules pack');
    loader.reject();
    await settle(harness);

    expect(pageText(harness)).toContain('The pack did not load. Pick it again to retry.');
    expect(present(textAreas(harness)[0]).value).toBe(example);

    await pressIn(harness, 'Statistics from', 'Core rules pack');
    loader.resolve(PACK_DEFINITIONS);
    await settle(harness);
    expect(pageText(harness)).not.toContain('The pack did not load.');
    expect(present(textAreas(harness)[0]).value).toBe(PACK_DEFINITIONS);
  });

  it('drops a load that a newer pick overtook', async () => {
    const loader = new ScriptedLoader();
    const harness = await openWith(loader);
    await pressIn(harness, 'Statistics from', 'Core rules pack');
    await pressIn(harness, 'Statistics from', 'Example');
    await pressIn(harness, 'Statistics from', 'Core rules pack');

    // The first pack load and the example load both answer after the second pack pick, so both are dropped.
    loader.resolve('[]');
    loader.resolve('[]');
    await settle(harness);
    expect(present(harness.routeNativeElement).querySelector('fr-skeleton')).not.toBeNull();
    loader.resolve(PACK_DEFINITIONS);
    await settle(harness);
    expect(present(textAreas(harness)[0]).value).toBe(PACK_DEFINITIONS);
  });
});
