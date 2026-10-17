import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { ruleLimitSettingsOf } from '../../testing/rule-limit-settings-testing';
import { id, openSheet, present } from '../../testing/sheet-page-harness';
import type { OpenSheet } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';

const SETTINGS_URL = `/api/characters/${id}/rule-limit-settings`;

/** The table limits panel of the Plan tab. */
function panelOf({ root }: OpenSheet): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-rule-limits'));
}

/** Opens the Plan tab, answering the character's own limits with `settings`. */
async function open(settings: object): Promise<OpenSheet> {
  const sheet = await openSheet(undefined, { ruleLimitSettings: settings });
  await vi.waitFor(() => {
    expect(panelOf(sheet).textContent).toContain('Items invested');
  });
  return sheet;
}

describe('SheetRuleLimits', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('lists the four limits with the core rules’ number beside each', async () => {
    const panel = panelOf(await open(ruleLimitSettingsOf()));
    const text = textOf(panel);
    for (const label of [
      'Items invested',
      'Hands to hold things in',
      'Property runes per potency rune grade',
      'Lines in an inventory',
    ]) {
      expect(text).toContain(label);
    }
    expect(text).toContain('Core rules: 10');
    expect(text).not.toContain('Changed');
    expect(text).toContain('From the core rules');
  });

  it('marks a changed limit and offers a reset for the owner, who returns it to the core rules’', async () => {
    const sheet = await open(ruleLimitSettingsOf({ investedMax: 12 }));
    const panel = panelOf(sheet);
    expect(textOf(panel)).toContain('Changed');

    const reset = present([...panel.querySelectorAll('button')].find((button) => textOf(button) === 'Reset'));
    reset.click();
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      http.expectOne({ method: 'DELETE', url: `${SETTINGS_URL}/investedMax` }).flush(ruleLimitSettingsOf());
    });
    await vi.waitFor(() => {
      expect(textOf(panelOf(sheet))).not.toContain('Changed');
    });
    // The limits the sheet's inventory is held to are read again, as they changed.
    await vi.waitFor(() => {
      http.expectOne({ method: 'GET', url: `/api/characters/${id}/rule-limits` }).flush({});
    });
  });

  it('is read-only while a campaign decides, and says which', async () => {
    const settings = { ...ruleLimitSettingsOf({ handsMax: 1 }), decidedBy: 'campaign', manageable: false };
    const panel = panelOf(await open({ ...settings, campaign: 'Abomination Vaults' }));
    expect(textOf(panel)).toContain('Abomination Vaults decides the table limits this character is held to.');
    expect(panel.querySelectorAll('button')).toHaveLength(0);
    expect(panel.querySelectorAll('input')).toHaveLength(0);
  });

  it('says a number comes from a variant rule, and that the owner’s own beats it', async () => {
    const fromVariant = panelOf(await open(ruleLimitSettingsOf({}, { investedMax: 12 })));
    expect(textOf(fromVariant)).toContain('From a variant rule');
    expect(textOf(fromVariant)).not.toContain('Changed');
  });

  it('says a number is the owner’s once they set it', async () => {
    const panel = panelOf(await open(ruleLimitSettingsOf({ investedMax: 9 }, { investedMax: 12 })));
    expect(textOf(panel)).toContain('Set by you');
  });

  it('says a number is the campaign GM’s while a campaign decides', async () => {
    const settings = ruleLimitSettingsOf({ handsMax: 1 }) as { limits: object[] };
    const limits = settings.limits.map((each) => ({ ...each, source: 'campaign' }));
    const panel = panelOf(
      await open({ ...settings, limits, decidedBy: 'campaign', manageable: false, campaign: 'Abomination Vaults' }),
    );
    expect(textOf(panel)).toContain("Set by the campaign's GM");
  });
});
