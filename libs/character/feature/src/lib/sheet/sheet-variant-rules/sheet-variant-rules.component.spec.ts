import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, openSheet, present } from '../../testing/sheet-page-harness';
import type { OpenSheet } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';

/** The core rules pack's Proficiency Without Level, as the character's list names it. */
const withoutLevel = {
  variantId: 'a8e09e01-8dbe-5055-920b-453ebd93493d',
  name: 'Proficiency Without Level',
  packTitle: 'Core Rules',
};
/** A variant rule of a homebrew pack, which no registry here holds. */
const gritty = {
  variantId: '3a1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e11',
  name: 'Gritty Healing',
  packTitle: 'Table Rules',
};

interface VariantRulesJson {
  readonly decidedBy: 'character' | 'campaign';
  readonly campaign?: string;
  readonly manageable: boolean;
  readonly enabled: readonly object[];
  readonly available: readonly object[];
}

const VARIANT_RULES_URL = `/api/characters/${id}/variant-rules`;

/** Every button whose text starts with `label`, in document order. */
function buttons(root: HTMLElement, label: string): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')].filter((candidate) => textOf(candidate).startsWith(label));
}

/** The vitals' headings: AC, the three saves, Perception and the Speed, with their totals. */
function vitalsOf(root: HTMLElement): readonly string[] {
  return [...present(root.querySelector('pio-vitals')).querySelectorAll('summary')].map((summary) => textOf(summary));
}

/** Opens the Plan tab, answering the character's variant rules with `rules`. */
async function open(rules: VariantRulesJson): Promise<OpenSheet> {
  const sheet = await openSheet(undefined, { characterVariantRules: rules });
  await vi.waitFor(() => {
    expect(sheet.root.textContent).toContain('Proficiency Without Level');
  });
  return sheet;
}

describe('SheetVariantRules', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('lists the variant rules of the packs in use by name, each with its pack, none on yet', async () => {
    const { root } = await open({
      decidedBy: 'character',
      manageable: true,
      enabled: [],
      available: [withoutLevel, gritty],
    });
    const section = present(root.querySelector('pio-sheet-variant-rules'));
    expect(section.textContent).toContain('Gritty Healing');
    expect(section.textContent).toContain('Table Rules');
    expect(section.textContent).toContain('Core Rules');
    expect(buttons(section as HTMLElement, 'Turn on')).toHaveLength(2);
    expect(buttons(section as HTMLElement, 'Turn off')).toHaveLength(0);
  });

  it('is read-only while a campaign decides, and says which', async () => {
    const { root } = await open({
      decidedBy: 'campaign',
      campaign: 'Abomination Vaults',
      manageable: false,
      enabled: [withoutLevel],
      available: [],
    });
    const section = present(root.querySelector<HTMLElement>('pio-sheet-variant-rules'));
    expect(section.textContent).toContain('Abomination Vaults decides which variant rules this character uses.');
    expect(section.textContent).toContain('On');
    expect(buttons(section, 'Turn on')).toHaveLength(0);
    expect(buttons(section, 'Turn off')).toHaveLength(0);
  });

  it('turns Proficiency Without Level on, and the sheet works the character out with it', async () => {
    const { root } = await open({
      decidedBy: 'character',
      manageable: true,
      enabled: [],
      available: [withoutLevel],
    });
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      expect(vitalsOf(root)).toStrictEqual([
        'Armor Class 12',
        'Fortitude +1',
        'Reflex +2',
        'Will +1',
        'Perception +1',
        'Speed 30',
      ]);
    });

    present(buttons(root, 'Turn on')[0]).click();
    await vi.waitFor(() => {
      const posted = http.expectOne({ method: 'POST', url: VARIANT_RULES_URL });
      expect(posted.request.body).toStrictEqual({ variantId: withoutLevel.variantId });
      posted.flush({ decidedBy: 'character', manageable: true, enabled: [withoutLevel], available: [] });
    });
    await vi.waitFor(() => {
      expect(buttons(root, 'Turn off')).toHaveLength(1);
    });
    // Untrained is -2 without level, not 0: every statistic loses 2.
    await vi.waitFor(() => {
      expect(vitalsOf(root).map((heading) => heading.replace('−', '-'))).toStrictEqual([
        'Armor Class 10',
        'Fortitude -1',
        'Reflex +0',
        'Will -1',
        'Perception -1',
        'Speed 30',
      ]);
    });
  });

  it('turns it off again, and the sheet goes back to the book’s table', async () => {
    const { root } = await open({
      decidedBy: 'character',
      manageable: true,
      enabled: [withoutLevel],
      available: [],
    });
    const http = TestBed.inject(HttpTestingController);

    present(buttons(root, 'Turn off')[0]).click();
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'DELETE', url: `${VARIANT_RULES_URL}/${withoutLevel.variantId}` })
        .flush({ decidedBy: 'character', manageable: true, enabled: [], available: [withoutLevel] });
    });
    await vi.waitFor(() => {
      expect(vitalsOf(root)).toContain('Perception +1');
    });
  });

  it('says why a change was refused', async () => {
    const { root } = await open({
      decidedBy: 'character',
      manageable: true,
      enabled: [],
      available: [withoutLevel],
    });
    const http = TestBed.inject(HttpTestingController);

    present(buttons(root, 'Turn on')[0]).click();
    await vi.waitFor(() => {
      http.expectOne({ method: 'POST', url: VARIANT_RULES_URL }).flush(
        {
          type: 'conflict',
          title: 'Conflict',
          status: 409,
          message: { key: 'character.variantRules.campaignDecides', params: { campaign: 'Abomination Vaults' } },
        },
        { status: 409, statusText: 'Conflict' },
      );
    });
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Abomination Vaults decides which variant rules this character uses.');
    });
  });
});
